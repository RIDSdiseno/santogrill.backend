import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/** Contrato de error único para toda la API. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = res.getHeader('x-request-id');

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: err.flatten().fieldErrors, requestId }
    });
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) logger.error({ err, requestId }, err.message);
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details ?? undefined, requestId }
    });
  }

  logger.error({ err, requestId, path: req.path }, 'Error no controlado');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProd ? 'Error interno del servidor' : String(err),
      requestId
    }
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
}
