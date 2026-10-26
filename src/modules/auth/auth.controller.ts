import { Router } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { autenticar } from '../../middlewares/auth.js';
import { limiteLogin } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { loginSchema } from './auth.schema.js';
import { authService } from './auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  limiteLogin,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { token, usuario } = await authService.login(req.body);
    res.cookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    });
    res.json({ data: usuario });
  })
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, { path: '/' });
  res.status(204).end();
});

authRouter.get('/me', autenticar, (req, res) => {
  res.json({ data: req.usuario });
});
