import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

type Fuente = 'body' | 'query' | 'params';

/**
 * Valida y NORMALIZA el input en el borde de la API.
 * Todo lo que llega del cliente es no confiable, aunque React ya lo haya validado.
 */
export const validate =
  (schema: ZodSchema, fuente: Fuente = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[fuente]);
    if (!parsed.success) return next(parsed.error);
    if (fuente === 'body') req.body = parsed.data;
    else Object.assign(req[fuente], parsed.data);
    next();
  };
