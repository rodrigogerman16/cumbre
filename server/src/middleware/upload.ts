import multer from 'multer';
import { HttpError } from '../lib/http-error.js';

export const MEDIA_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

// memoryStorage: necesitamos el buffer completo para pasarlo por el hook de
// moderación ANTES de decidir si se guarda (ver src/lib/moderation.ts). Si
// el archivo se rechaza, nunca toca el storage (disco/S3).
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!MEDIA_EXT_BY_MIME[file.mimetype]) {
      cb(new HttpError(415, `Tipo de archivo no soportado: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});
