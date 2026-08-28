import type { NextFunction, Request, RequestHandler } from 'express';
import { verifyToken } from '../lib/auth.js';

export interface AuthedRequest extends Request {
  userId: string;
}

export const requireAuth: RequestHandler = (req, res, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  try {
    const payload = verifyToken(token);
    (req as AuthedRequest).userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Igual que requireAuth, pero no rechaza si no hay token: deja al handler
// decidir. Usado en endpoints públicos (feed, detalle de ruta) que
// personalizan la respuesta cuando el usuario está logueado (ej. si ya
// reaccionó a la ruta) sin exigir sesión para verlos.
export const optionalAuth: RequestHandler = (req, _res, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (token) {
    try {
      const payload = verifyToken(token);
      (req as AuthedRequest).userId = payload.sub;
    } catch {
      // token inválido en un endpoint opcional: seguimos como anónimo
    }
  }
  next();
};

// req: Request<any> para que acepte también requests con params tipados
// (ej. Request<{ id: string }, ...>) sin chocar con el chequeo de overlap de TS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getUserId(req: Request<any>): string | undefined {
  return (req as unknown as Partial<AuthedRequest>).userId;
}
