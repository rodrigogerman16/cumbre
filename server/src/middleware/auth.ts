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

export function getUserId(req: Request): string | undefined {
  return (req as Partial<AuthedRequest>).userId;
}
