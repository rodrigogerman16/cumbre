import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';

export interface SavedFile {
  url: string;
}

async function saveLocal(buffer: Buffer, filename: string): Promise<SavedFile> {
  const dir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  const base = process.env.PUBLIC_BASE_URL ?? '';
  return { url: `${base}/uploads/${filename}` };
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const config: S3ClientConfig = { region: process.env.S3_REGION };
  // Cloudflare R2 (y otros S3-compatibles) necesitan un endpoint explícito.
  if (process.env.S3_ENDPOINT) config.endpoint = process.env.S3_ENDPOINT;
  if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    };
  }

  s3Client = new S3Client(config);
  return s3Client;
}

async function saveS3(buffer: Buffer, filename: string, contentType: string): Promise<SavedFile> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('Falta S3_BUCKET en las variables de entorno para STORAGE_DRIVER=s3');
  }

  await getS3Client().send(
    new PutObjectCommand({ Bucket: bucket, Key: filename, Body: buffer, ContentType: contentType }),
  );

  const base = process.env.S3_PUBLIC_URL_BASE;
  if (!base) {
    throw new Error('Falta S3_PUBLIC_URL_BASE en las variables de entorno para STORAGE_DRIVER=s3');
  }
  return { url: `${base}/${filename}` };
}

// Único punto de guardado de media. Los handlers de rutas llaman siempre a
// esta función — nunca escriben a disco ni arman URLs por su cuenta — así
// que pasar de disco local a S3/R2 en producción es cambiar STORAGE_DRIVER
// (y las credenciales) en el .env, no tocar código.
export async function saveMediaFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<SavedFile> {
  const driver = process.env.STORAGE_DRIVER ?? 'local';
  if (driver === 's3') return saveS3(buffer, filename, contentType);
  return saveLocal(buffer, filename);
}
