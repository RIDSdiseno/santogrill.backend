import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';

export const productosRouter = Router();

const querySchema = z.object({
  categoria: z.string().trim().max(40).optional()
});

productosRouter.get(
  '/',
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { categoria } = req.query as z.infer<typeof querySchema>;
    const productos = await prisma.producto.findMany({
      where: { activo: true, ...(categoria ? { categoria } : {}) },
      orderBy: [{ categoria: 'asc' }, { precio: 'asc' }]
    });
    res.json({ data: productos });
  })
);
