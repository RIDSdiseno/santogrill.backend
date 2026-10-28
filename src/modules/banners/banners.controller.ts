import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';

export const bannersRouter = Router();

const SECCIONES = ['tienda', 'eventos', 'general'] as const;

const bannerCreateSchema = z.object({
  seccion: z.enum(SECCIONES).default('general'),
  orden: z.number().int().min(0),
  src: z.string().url(),
  alt: z.string().trim().min(1).max(200),
  titulo: z.string().trim().max(200).optional(),
  subtitulo: z.string().trim().max(500).optional(),
  activo: z.boolean().optional()
});

const bannerUpdateSchema = bannerCreateSchema.partial();

const reordenarSchema = z.object({
  ids: z.array(z.string()).min(1)
});

/** GET / → banners activos. ?seccion=tienda filtra por sección, ?todos=1 para admin */
bannersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const seccion = typeof req.query['seccion'] === 'string' ? req.query['seccion'] : undefined;
    const todos = req.query['todos'] === '1';

    const banners = await prisma.banner.findMany({
      where: {
        ...(todos ? {} : { activo: true }),
        ...(seccion ? { seccion } : {})
      },
      orderBy: { orden: 'asc' }
    });
    res.json({ data: banners });
  })
);

/** POST / → crear banner (ADMIN) */
bannersRouter.post(
  '/',
  autenticar,
  autorizar('ADMIN'),
  validate(bannerCreateSchema),
  asyncHandler(async (req, res) => {
    const banner = await prisma.banner.create({ data: req.body });
    res.status(201).json({ data: banner });
  })
);

/** PATCH /:id → actualizar banner (ADMIN) */
bannersRouter.patch(
  '/:id',
  autenticar,
  autorizar('ADMIN'),
  validate(bannerUpdateSchema),
  asyncHandler(async (req, res) => {
    const banner = await prisma.banner.update({
      where: { id: req.params.id as string },
      data: req.body
    });
    res.json({ data: banner });
  })
);

/** DELETE /:id → eliminar banner (ADMIN) */
bannersRouter.delete(
  '/:id',
  autenticar,
  autorizar('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.banner.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  })
);

/** PUT /reordenar → reordenar banners por array de ids (ADMIN) */
bannersRouter.put(
  '/reordenar',
  autenticar,
  autorizar('ADMIN'),
  validate(reordenarSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as z.infer<typeof reordenarSchema>;
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.banner.update({ where: { id }, data: { orden: index + 1 } })
      )
    );
    res.json({ ok: true });
  })
);
