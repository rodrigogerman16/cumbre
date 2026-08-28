import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import authRouter from './routes/auth.js';
import routesRouter from './routes/routes.js';
import { HttpError } from './lib/http-error.js';

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigin = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin(origin, callback) {
      // Sin header Origin (curl, server-to-server, mismo origen): permitir.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (configuredOrigin && origin === configuredOrigin) {
        callback(null, true);
        return;
      }
      // En dev, Vite puede correr en otro puerto si el 5173 está ocupado
      // (5174, 5175, ...) — aceptar cualquier localhost evita que el CORS
      // rompa por eso. En producción esto queda desactivado.
      if (!isProduction && /^https?:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido por CORS'));
    },
  }),
);
app.use(express.json());
app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads')),
);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cumbre-server' });
});

app.use('/auth', authRouter);
app.use('/routes', routesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'JSON inválido' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`cumbre-server escuchando en http://localhost:${port}`);
});
