import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export interface SesionUsuario {
  sub: string;
  email: string;
  nombre: string;
  rol: 'ADMIN' | 'VENTAS';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: SesionUsuario;
    }
  }
}

/** Autenticación: ¿quién eres? Lee la cookie httpOnly firmada. */
export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) return next(HttpError.unauthorized());
  try {
    req.usuario = jwt.verify(token, env.JWT_SECRET) as SesionUsuario;
    next();
  } catch {
    next(HttpError.unauthorized('Sesión inválida o expirada'));
  }
}

/** Autorización: ¿puedes hacer esto? Estar logueado no implica tener permiso. */
export const autorizar =
  (...roles: Array<SesionUsuario['rol']>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) return next(HttpError.unauthorized());
    if (!roles.includes(req.usuario.rol)) return next(HttpError.forbidden());
    next();
  };
