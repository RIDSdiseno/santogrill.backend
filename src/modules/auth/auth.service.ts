import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/httpError.js';
import type { SesionUsuario } from '../../middlewares/auth.js';
import { authRepository } from './auth.repository.js';
import type { LoginInput } from './auth.schema.js';

export const authService = {
  async login({ email, clave }: LoginInput) {
    const usuario = await authRepository.porEmail(email);
    // Comparación en tiempo constante incluso si el usuario no existe:
    // así no se filtra qué correos están registrados.
    const hash = usuario?.passwordHash ?? '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$0000000000000000000000000000000000000000000';
    const ok = await argon2.verify(hash, clave).catch(() => false);

    if (!usuario || !usuario.activo || !ok) {
      throw HttpError.unauthorized('Usuario o clave incorrectos');
    }

    await authRepository.marcarAcceso(usuario.id);

    const payload: SesionUsuario = {
      sub: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
    return { token, usuario: payload };
  }
};
