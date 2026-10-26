import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';
import { limitePublico } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { mailService } from '../../services/mail.service.js';

export const mensajesRouter = Router();

const crearSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  texto: z.string().trim().min(5).max(600),
  // honeypot: si viene relleno, es un bot
  web: z.string().max(0).optional()
});

const estadoSchema = z.object({ estado: z.enum(['NUEVO', 'LEIDO', 'RESPONDIDO']) });

mensajesRouter.post(
  '/',
  limitePublico,
  validate(crearSchema),
  asyncHandler(async (req, res) => {
    const { nombre, email, texto } = req.body as z.infer<typeof crearSchema>;
    const mensaje = await prisma.mensaje.create({
      data: { codigo: 'MS-' + randomBytes(3).toString('hex').toUpperCase(), nombre, email, texto }
    });
    await mailService.avisarMensaje({ nombre, email, texto });
    res.status(201).json({ data: { codigo: mensaje.codigo } });
  })
);

mensajesRouter.get(
  '/',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  asyncHandler(async (_req, res) => {
    const items = await prisma.mensaje.findMany({ orderBy: { creadoEn: 'desc' }, take: 300 });
    res.json({ data: { items, total: items.length } });
  })
);

mensajesRouter.patch(
  '/:id',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  validate(estadoSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.mensaje.update({ where: { id: req.params.id! }, data: { estado: req.body.estado } });
    res.json({ data });
  })
);
