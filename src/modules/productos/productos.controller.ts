import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';
import { HttpError } from '../../utils/httpError.js';

export const productosRouter = Router();

const querySchema = z.object({
  categoria: z.string().trim().max(40).optional(),
  todos: z.enum(['1']).optional()
});

const productoSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(500).optional().nullable(),
  categoria: z.string().trim().min(1).max(40),
  precio: z.coerce.number().int().min(0),
  imagen: z.string().trim().max(300).optional().nullable(),
  activo: z.boolean().optional()
});

const patchSchema = productoSchema.partial();

productosRouter.get(
  '/',
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { categoria, todos } = req.query as z.infer<typeof querySchema>;
    const esAdmin = todos === '1';
    const productos = await prisma.producto.findMany({
      where: { ...(esAdmin ? {} : { activo: true }), ...(categoria ? { categoria } : {}) },
      orderBy: [{ categoria: 'asc' }, { precio: 'asc' }]
    });
    res.json({ data: productos });
  })
);

productosRouter.post(
  '/',
  autenticar,
  autorizar('ADMIN'),
  validate(productoSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof productoSchema>;
    const existente = await prisma.producto.findUnique({ where: { slug: data.slug } });
    if (existente) throw HttpError.conflict('Ya existe un producto con ese slug');
    const producto = await prisma.producto.create({ data: { ...data, activo: data.activo ?? true } });
    res.status(201).json({ data: producto });
  })
);

productosRouter.patch(
  '/:id',
  autenticar,
  autorizar('ADMIN'),
  validate(patchSchema),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const producto = await prisma.producto.update({ where: { id }, data: req.body });
    res.json({ data: producto });
  })
);

productosRouter.delete(
  '/:id',
  autenticar,
  autorizar('ADMIN'),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    await prisma.producto.delete({ where: { id } });
    res.json({ data: { ok: true } });
  })
);
