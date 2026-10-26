import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';
import { limitePublico } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { mailService } from '../../services/mail.service.js';
import { env } from '../../config/env.js';

export const suscriptoresRouter = Router();

const crearSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  telefono: z.string().trim().max(20).optional(),
  visitanteId: z.string().trim().max(60).optional()
});

suscriptoresRouter.post(
  '/',
  limitePublico,
  validate(crearSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof crearSchema>;
    const suscriptor = await prisma.suscriptor.upsert({
      where: { email: body.email },
      update: { nombre: body.nombre, telefono: body.telefono ?? null, activo: true },
      create: { ...body, telefono: body.telefono ?? null, visitanteId: body.visitanteId ?? null }
    });
    await mailService.bienvenidaSuscriptor(suscriptor);
    res.status(201).json({ data: { email: suscriptor.email, nombre: suscriptor.nombre, descuento: env.DESCUENTO_SUSCRIPTOR } });
  })
);

suscriptoresRouter.get(
  '/',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  asyncHandler(async (_req, res) => {
    const items = await prisma.suscriptor.findMany({ orderBy: { creadoEn: 'desc' }, take: 500 });
    res.json({ data: { items, total: items.length } });
  })
);
