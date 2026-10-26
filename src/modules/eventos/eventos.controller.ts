import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';
import { limitePublico } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { auditoriaService } from '../../services/auditoria.service.js';
import { mailService } from '../../services/mail.service.js';

export const eventosRouter = Router();

const ETAPAS = ['COTIZACION_RECIBIDA', 'CONTACTADO', 'PROPUESTA_ENVIADA', 'CONFIRMADO', 'PERDIDO'] as const;

const crearSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120).optional(),
  telefono: z.string().trim().max(20).optional(),
  fechaEvento: z.coerce.date().optional(),
  lugar: z.string().trim().max(140).optional(),
  personas: z.coerce.number().int().min(1).max(5000).optional(),
  servicio: z.string().trim().min(2).max(60),
  detalle: z.string().trim().max(600).optional()
});

const etapaSchema = z.object({ etapa: z.enum(ETAPAS), valorEstimado: z.coerce.number().int().min(0).optional() });

eventosRouter.post(
  '/',
  limitePublico,
  validate(crearSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof crearSchema>;
    const evento = await prisma.evento.create({
      data: {
        codigo: 'EV-' + randomBytes(3).toString('hex').toUpperCase(),
        nombre: body.nombre,
        email: body.email ?? null,
        telefono: body.telefono ?? null,
        fechaEvento: body.fechaEvento ?? null,
        lugar: body.lugar ?? null,
        personas: body.personas ?? null,
        servicio: body.servicio,
        detalle: body.detalle ?? null
      }
    });
    mailService.avisarEvento(evento).catch(() => {});
    res.status(201).json({ data: { codigo: evento.codigo } });
  })
);

eventosRouter.get(
  '/',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  asyncHandler(async (_req, res) => {
    const items = await prisma.evento.findMany({ orderBy: { creadoEn: 'desc' }, take: 300 });
    const embudo = await prisma.evento.groupBy({ by: ['etapa'], _count: { _all: true } });
    res.json({ data: { items, total: items.length, embudo } });
  })
);

eventosRouter.patch(
  '/:id/etapa',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  validate(etapaSchema),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const data = await prisma.evento.update({
      where: { id },
      data: { etapa: req.body.etapa as import('@prisma/client').EtapaEvento, valorEstimado: req.body.valorEstimado ?? undefined }
    });
    await auditoriaService.registrar({
      usuarioId: req.usuario!.sub, accion: 'EVENTO_ETAPA', entidad: 'Evento', entidadId: id, datos: { etapa: String(req.body.etapa) }
    });
    res.json({ data });
  })
);
