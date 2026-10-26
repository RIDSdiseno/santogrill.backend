import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';
import { limitePublico } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { cambiarEstadoSchema, crearPedidoSchema, listarPedidosSchema } from './pedidos.schema.js';
import { pedidosService } from './pedidos.service.js';

export const pedidosRouter = Router();

// Público: el carrito del sitio crea el pedido. Idempotente por header.
pedidosRouter.post(
  '/',
  limitePublico,
  validate(crearPedidoSchema),
  asyncHandler(async (req, res) => {
    const clave = req.header('Idempotency-Key') ?? undefined;
    const pedido = await pedidosService.crear(req.body, clave);
    res.status(201).json({ data: pedido });
  })
);

// Privado: portal interno.
pedidosRouter.get(
  '/',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  validate(listarPedidosSchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json({ data: await pedidosService.listar(req.query as never) });
  })
);

pedidosRouter.patch(
  '/:id',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  validate(cambiarEstadoSchema),
  asyncHandler(async (req, res) => {
    const actualizado = await pedidosService.cambiarEstado(req.params.id!, req.body.estado, req.usuario!.sub);
    res.json({ data: actualizado });
  })
);
