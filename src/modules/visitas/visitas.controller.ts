import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';
import { limiteVisitas } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { env } from '../../config/env.js';

export const visitasRouter = Router();

const crearSchema = z.object({
  visitanteId: z.string().trim().min(4).max(60),
  pagina: z.string().trim().max(200).default('/'),
  origen: z.string().trim().max(200).optional(),
  pantalla: z.string().trim().max(20).optional(),
  idioma: z.string().trim().max(12).optional()
});

/** La IP nunca se guarda en claro: solo un hash con sal del secreto del servidor. */
const hashIp = (ip: string) => createHash('sha256').update(ip + env.JWT_SECRET).digest('hex').slice(0, 32);

visitasRouter.post(
  '/',
  limiteVisitas,
  validate(crearSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof crearSchema>;
    await prisma.visita.create({
      data: {
        ...body,
        origen: body.origen ?? null,
        pantalla: body.pantalla ?? null,
        idioma: body.idioma ?? null,
        userAgent: req.header('user-agent')?.slice(0, 200) ?? null,
        ipHash: req.ip ? hashIp(req.ip) : null
      }
    });
    res.status(202).json({ data: { ok: true } });
  })
);

visitasRouter.get(
  '/',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  asyncHandler(async (_req, res) => {
    const items = await prisma.visita.findMany({ orderBy: { creadoEn: 'desc' }, take: 500 });
    res.json({ data: { items, total: items.length } });
  })
);
