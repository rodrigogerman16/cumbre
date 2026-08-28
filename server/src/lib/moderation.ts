import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import { ModerationStatus } from '@prisma/client';

// ffmpeg-static es un paquete CJS con tipos que no resuelven bien bajo
// moduleResolution NodeNext; require() directo evita el problema.
const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static') as string | null;
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

export interface ModerationResult {
  status: ModerationStatus;
  reason: string | null;
}

// Sightengine (modelo "nudity-2.0"): devuelve tres probabilidades que suman
// ~1 — raw (explícito), partial (sugerente/parcial) y safe. Ver
// https://sightengine.com/docs/nudity-detection
interface SightengineNudityResponse {
  nudity?: { raw?: number; partial?: number; safe?: number };
  error?: { message?: string };
}

// Umbrales de negocio: contenido sexual explícito se rechaza automático;
// contenido dudoso queda pendiente de revisión manual; el resto se aprueba.
const REJECT_THRESHOLD = 0.5;
const REVIEW_THRESHOLD = 0.2;

function classifyNudity(data: SightengineNudityResponse): ModerationResult {
  const raw = data.nudity?.raw ?? 0;
  const partial = data.nudity?.partial ?? 0;

  if (raw >= REJECT_THRESHOLD) {
    return { status: ModerationStatus.REJECTED, reason: 'Contenido sexual explícito detectado' };
  }
  if (raw >= REVIEW_THRESHOLD || partial >= REVIEW_THRESHOLD) {
    return { status: ModerationStatus.PENDING, reason: 'Contenido dudoso: queda pendiente de revisión manual' };
  }
  return { status: ModerationStatus.APPROVED, reason: null };
}

async function callSightengineImage(buffer: Buffer, mimeType: string): Promise<ModerationResult> {
  const apiUser = process.env.SIGHTENGINE_USER;
  const apiSecret = process.env.SIGHTENGINE_SECRET;
  if (!apiUser || !apiSecret) {
    throw new Error(
      'Faltan SIGHTENGINE_USER/SIGHTENGINE_SECRET (requeridos con MODERATION_MODE=sightengine)',
    );
  }

  const form = new FormData();
  form.set('media', new Blob([new Uint8Array(buffer)], { type: mimeType }), 'media');
  form.set('models', 'nudity-2.0');
  form.set('api_user', apiUser);
  form.set('api_secret', apiSecret);

  const response = await fetch('https://api.sightengine.com/1.0/check.json', {
    method: 'POST',
    body: form,
  });
  const data = (await response.json()) as SightengineNudityResponse;
  if (!response.ok) {
    throw new Error(`Sightengine respondió ${response.status}: ${data.error?.message ?? 'error desconocido'}`);
  }

  return classifyNudity(data);
}

// El peor resultado gana: un solo frame explícito rechaza todo el video.
function worstResult(results: ModerationResult[]): ModerationResult {
  const rejected = results.find((r) => r.status === ModerationStatus.REJECTED);
  if (rejected) return rejected;
  const pending = results.find((r) => r.status === ModerationStatus.PENDING);
  if (pending) return pending;
  return { status: ModerationStatus.APPROVED, reason: null };
}

async function extractFrames(videoPath: string, outputDir: string): Promise<string[]> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      // fps=1/2 -> un frame cada 2 segundos, como pide el requerimiento.
      .outputOptions(['-vf', 'fps=1/2'])
      .output(path.join(outputDir, 'frame-%03d.jpg'))
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  const files = await readdir(outputDir);
  return files.filter((f) => f.startsWith('frame-')).map((f) => path.join(outputDir, f));
}

async function moderateVideoBuffer(buffer: Buffer, mimeType: string): Promise<ModerationResult> {
  const ext = mimeType === 'video/webm' ? 'webm' : mimeType === 'video/quicktime' ? 'mov' : 'mp4';
  const workDir = await mkdtemp(path.join(tmpdir(), 'cumbre-moderation-'));
  const videoPath = path.join(workDir, `input.${ext}`);

  try {
    await writeFile(videoPath, buffer);
    const framePaths = await extractFrames(videoPath, workDir);

    if (framePaths.length === 0) {
      // Video más corto que 2s, o sin frames extraíbles: moderamos igual
      // el archivo completo como si fuera una sola imagen no tiene sentido
      // (es video), así que lo dejamos pendiente de revisión manual.
      return { status: ModerationStatus.PENDING, reason: 'No se pudieron extraer frames para moderar' };
    }

    const frameResults: ModerationResult[] = [];
    for (const framePath of framePaths) {
      const frameBuffer = await readFile(framePath);
      frameResults.push(await callSightengineImage(frameBuffer, 'image/jpeg'));
    }

    return worstResult(frameResults);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

// Punto único de moderación: todo upload de foto/video pasa por acá antes
// de guardarse. En modo "stub" (default en dev) aprueba todo sin llamar a
// ningún servicio externo. En modo "sightengine" llama a la API real —
// imágenes se moderan directo, videos se muestrean cada 2s (ver arriba) y
// se modera cada frame por separado.
export async function moderateMedia(buffer: Buffer, mimeType: string): Promise<ModerationResult> {
  const mode = process.env.MODERATION_MODE ?? 'stub';
  if (mode === 'stub') {
    return { status: ModerationStatus.APPROVED, reason: null };
  }

  if (mimeType.startsWith('video/')) {
    return moderateVideoBuffer(buffer, mimeType);
  }
  return callSightengineImage(buffer, mimeType);
}
