import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';

export const galeriaRouter = Router();

const fotoCreateSchema = z.object({
  src: z.string().min(1).max(500),
  alt: z.string().trim().min(1).max(200),
  orden: z.number().int().min(0),
  grande: z.boolean().optional(),
  activo: z.boolean().optional()
});

const fotoUpdateSchema = fotoCreateSchema.partial();

const reordenarSchema = z.object({
  ids: z.array(z.string()).min(1)
});

/** GET / → lista fotos activas ordenadas por orden */
galeriaRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const fotos = await prisma.galeriaFoto.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' }
    });
    res.json({ data: fotos });
  })
);

/** POST / → crear foto (ADMIN) */
galeriaRouter.post(
  '/',
  autenticar,
  autorizar('ADMIN'),
  validate(fotoCreateSchema),
  asyncHandler(async (req, res) => {
    const foto = await prisma.galeriaFoto.create({ data: req.body });
    res.status(201).json({ data: foto });
  })
);

/** PATCH /:id → actualizar foto (ADMIN) */
galeriaRouter.patch(
  '/:id',
  autenticar,
  autorizar('ADMIN'),
  validate(fotoUpdateSchema),
  asyncHandler(async (req, res) => {
    const foto = await prisma.galeriaFoto.update({
      where: { id: req.params.id as string },
      data: req.body
    });
    res.json({ data: foto });
  })
);

/** DELETE /:id → eliminar foto (ADMIN) */
galeriaRouter.delete(
  '/:id',
  autenticar,
  autorizar('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.galeriaFoto.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  })
);

/** PUT /reordenar → reordenar fotos por array de ids (ADMIN) */
galeriaRouter.put(
  '/reordenar',
  autenticar,
  autorizar('ADMIN'),
  validate(reordenarSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as z.infer<typeof reordenarSchema>;
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.galeriaFoto.update({ where: { id }, data: { orden: index + 1 } })
      )
    );
    res.json({ ok: true });
  })
);
