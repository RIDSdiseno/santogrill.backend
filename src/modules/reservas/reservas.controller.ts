import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { limitePublico } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';
import { mailService } from '../../services/mail.service.js';

export const reservasRouter = Router();

const crearSchema = z.object({
  tipo:       z.string().trim().min(2).max(60),
  fecha:      z.coerce.date(),
  horaInicio: z.string().trim().min(4).max(10),
  horaFin:    z.string().trim().min(4).max(10),
  servicio:   z.string().trim().max(120).optional(),
  nombre:     z.string().trim().min(2).max(80),
  telefono:   z.string().trim().max(20).optional(),
  notas:      z.string().trim().max(400).optional(),
});

reservasRouter.post(
  '/',
  limitePublico,
  validate(crearSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof crearSchema>;
    const reserva = await prisma.reserva.create({
      data: {
        codigo:     'RS-' + randomBytes(3).toString('hex').toUpperCase(),
        tipo:       body.tipo,
        fecha:      body.fecha,
        horaInicio: body.horaInicio,
        horaFin:    body.horaFin,
        servicio:   body.servicio ?? null,
        nombre:     body.nombre,
        telefono:   body.telefono ?? null,
        notas:      body.notas ?? null,
      },
    });
    mailService.avisarReserva(reserva).catch(() => {});
    res.status(201).json({ data: { codigo: reserva.codigo } });
  })
);

reservasRouter.get(
  '/',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  asyncHandler(async (_req, res) => {
    const items = await prisma.reserva.findMany({ orderBy: { fecha: 'asc' }, take: 300 });
    res.json({ data: { items, total: items.length } });
  })
);
