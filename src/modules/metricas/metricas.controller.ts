import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { autenticar, autorizar } from '../../middlewares/auth.js';

export const metricasRouter = Router();

/** KPIs del portal calculados en la base, no en el navegador. */
metricasRouter.get(
  '/resumen',
  autenticar,
  autorizar('ADMIN', 'VENTAS'),
  asyncHandler(async (_req, res) => {
    const [agg, pedidos, suscriptores, visitas, mensajesNuevos, embudo, topItems] = await Promise.all([
      prisma.pedido.aggregate({ _sum: { total: true }, _avg: { total: true }, where: { estado: { not: 'ANULADO' } } }),
      prisma.pedido.count({ where: { estado: { not: 'ANULADO' } } }),
      prisma.suscriptor.count({ where: { activo: true } }),
      prisma.visita.count(),
      prisma.mensaje.count({ where: { estado: 'NUEVO' } }),
      prisma.evento.groupBy({ by: ['etapa'], _count: { _all: true } }),
      prisma.pedidoItem.groupBy({ by: ['nombreProducto'], _sum: { cantidad: true }, orderBy: { _sum: { cantidad: 'desc' } }, take: 6 })
    ]);

    res.json({
      data: {
        ventas: agg._sum.total ?? 0,
        pedidos,
        ticketPromedio: Math.round(agg._avg.total ?? 0),
        suscriptores,
        visitas,
        mensajesNuevos,
        conversion: visitas ? Number(((pedidos / visitas) * 100).toFixed(1)) : 0,
        embudo: embudo.map((e) => ({ etapa: e.etapa, n: e._count._all })),
        topProductos: topItems.map((t) => ({ nombre: t.nombreProducto, cantidad: t._sum.cantidad ?? 0 }))
      }
    });
  })
);
