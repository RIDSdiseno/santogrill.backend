import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Cada request es trazable de punta a punta con el mismo id. */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('x-request-id', id);
  next();
}
