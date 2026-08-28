import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import authRouter from './routes/auth.js';
import routesRouter from './routes/routes.js';
import { HttpError } from './lib/http-error.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
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
