import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { limitePublico } from '../../middlewares/rateLimit.js';
import { prisma } from '../../config/prisma.js';
import { calcularTotales } from '../../utils/precios.js';
import { HttpError } from '../../utils/httpError.js';
import { crearSesion, consultarSesion } from './getnet.service.js';
import { mailService } from '../../services/mail.service.js';

export const pagosRouter = Router();

/**
 * POST /api/v1/pagos/iniciar
 * El carrito llama aquí. Crea el pedido (RECIBIDO) e inicia sesión Getnet.
 * Devuelve { processUrl } para redirigir el navegador al checkout de Getnet.
 */
pagosRouter.post(
  '/iniciar',
  limitePublico,
  asyncHandler(async (req, res) => {
    const { cliente, items, visitanteId } = req.body as {
      cliente: { nombre: string; telefono: string; email?: string; direccion?: string; comuna?: string };
      items: { productoId: string; cantidad: number }[];
      visitanteId?: string;
    };

    if (!cliente?.nombre || !cliente?.telefono || !items?.length) {
      throw HttpError.badRequest('Faltan datos del cliente o productos');
    }

    const ids = items.map((i) => i.productoId);
    const productos = await prisma.producto.findMany({ where: { id: { in: ids }, activo: true } });

    if (productos.length !== new Set(ids).size) throw HttpError.badRequest('Hay productos no disponibles');

    const lineas = items.map((i) => {
      const p = productos.find((x) => x.id === i.productoId)!;
      if (p.stock !== null && p.stock < i.cantidad) throw HttpError.conflict(`Sin stock de ${p.nombre}`);
      return { productoId: p.id, nombreProducto: p.nombre, precioUnitario: p.precio, cantidad: i.cantidad };
    });

    const subtotal = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
    const suscriptor = cliente.email
      ? await prisma.suscriptor.findUnique({ where: { email: cliente.email } })
      : null;
    const totales = calcularTotales(subtotal, Boolean(suscriptor?.activo));

    // Número único de pedido para correlacionar con Getnet
    const numero = 'SG-' + Date.now();

    const pedido = await prisma.pedido.create({
      data: {
        numero,
        estado: 'RECIBIDO',
        clienteNombre: cliente.nombre,
        clienteEmail: cliente.email ?? null,
        clienteFono: cliente.telefono,
        direccion: cliente.direccion ?? null,
        comuna: cliente.comuna ?? null,
        visitanteId: visitanteId ?? null,
        notas: 'Pago iniciado con tarjeta (Getnet)',
        ...totales,
        ...(suscriptor ? { suscriptor: { connect: { id: suscriptor.id } } } : {}),
        items: { create: lineas },
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const descripcion = lineas.map((l) => `${l.nombreProducto} x${l.cantidad}`).join(', ');

    // Incluimos el numero de pedido en returnUrl para que Getnet lo devuelva
    // sin depender de sessionStorage/localStorage del navegador
    const sesion = await crearSesion({
      orderId: pedido.numero,
      monto: totales.total,
      descripcion,
      returnUrl: `${frontendUrl}/pago/resultado?pedido=${encodeURIComponent(pedido.numero)}`,
      cancelUrl: `${frontendUrl}/pago/resultado?pedido=${encodeURIComponent(pedido.numero)}&cancelado=1`,
      ipAddress: req.ip ?? '127.0.0.1',
    });

    // Guardamos el requestId de Getnet en las notas para poder consultarlo luego
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { notas: `Getnet requestId: ${sesion.requestId}` },
    });

    res.json({ data: { processUrl: sesion.processUrl, numeroPedido: pedido.numero, requestId: sesion.requestId } });
  })
);

/**
 * POST /api/v1/pagos/notificacion
 * Webhook que Getnet llama cuando el pago se confirma o rechaza.
 */
pagosRouter.post(
  '/notificacion',
  asyncHandler(async (req, res) => {
    const { requestId, reference, status } = req.body as {
      requestId?: number;
      reference?: string;
      status?: { status?: string };
    };

    const estado = status?.status ?? '';
    const esPagado = /^(APPROVED|APPROVED_PARTIAL)$/.test(estado);
    const numeroPedido = reference ?? '';

    if (numeroPedido) {
      await prisma.pedido.updateMany({
        where: { numero: numeroPedido },
        data: {
          estado: esPagado ? 'EN_PREPARACION' : 'ANULADO',
          notas: `Getnet: ${estado} (requestId: ${requestId ?? ''})`,
        },
      });

      if (esPagado) {
        const pedido = await prisma.pedido.findFirst({
          where: { numero: numeroPedido },
          include: { items: true },
        });
        if (pedido) {
          mailService.avisarPagoAprobado({
            numero: pedido.numero,
            clienteNombre: pedido.clienteNombre,
            clienteFono: pedido.clienteFono ?? '',
            clienteEmail: pedido.clienteEmail,
            direccion: pedido.direccion,
            comuna: pedido.comuna,
            subtotal: pedido.subtotal,
            descuento: pedido.descuento,
            envio: pedido.envio,
            total: pedido.total,
            items: pedido.items,
          }).catch(() => {});
        }
      }
    }

    res.status(200).json({ ok: true });
  })
);

/**
 * GET /api/v1/pagos/estado?pedido=SG-xxx   (lookup por numero de pedido, preferido)
 * GET /api/v1/pagos/estado?requestId=X      (lookup directo por requestId Getnet)
 */
pagosRouter.get(
  '/estado',
  asyncHandler(async (req, res) => {
    const { requestId, pedido } = req.query as { requestId?: string; pedido?: string };

    let rid = requestId;

    if (!rid && pedido) {
      const p = await prisma.pedido.findFirst({ where: { numero: pedido } });
      if (!p) throw HttpError.notFound('Pedido no encontrado');

      // Si el pedido ya está confirmado en BD, devolvemos aprobado sin llamar a Getnet
      if (['EN_PREPARACION', 'DESPACHADO', 'ENTREGADO'].includes(p.estado)) {
        return res.json({ data: { requestId: 0, estado: 'APPROVED', pagado: true, orderId: p.numero, monto: p.total } });
      }
      if (p.estado === 'ANULADO') {
        return res.json({ data: { requestId: 0, estado: 'REJECTED', pagado: false, orderId: p.numero, monto: p.total } });
      }

      // Buscar requestId en notas (soporta ambos formatos de escritura)
      const match = p.notas?.match(/requestId[:\s]+(\d+)/i);
      if (!match) throw HttpError.badRequest('requestId de Getnet no registrado para este pedido');
      rid = match[1];
    }

    if (!rid) throw HttpError.badRequest('Falta el requestId o número de pedido');

    const sesion = await consultarSesion(rid);

    // Si el pago está aprobado, actualizamos el pedido y enviamos email
    // (cubre el caso en que el webhook no llega, ej. en desarrollo local)
    if (sesion.pagado && pedido) {
      const pedidoDB = await prisma.pedido.findFirst({
        where: { numero: pedido },
        include: { items: true },
      });
      if (pedidoDB && pedidoDB.estado === 'RECIBIDO') {
        await prisma.pedido.update({
          where: { id: pedidoDB.id },
          data: { estado: 'EN_PREPARACION', notas: `Getnet: APPROVED | requestId: ${rid}` },
        });
        mailService.avisarPagoAprobado({
          numero: pedidoDB.numero,
          clienteNombre: pedidoDB.clienteNombre,
          clienteFono: pedidoDB.clienteFono ?? '',
          clienteEmail: pedidoDB.clienteEmail,
          direccion: pedidoDB.direccion,
          comuna: pedidoDB.comuna,
          subtotal: pedidoDB.subtotal,
          descuento: pedidoDB.descuento,
          envio: pedidoDB.envio,
          total: pedidoDB.total,
          items: pedidoDB.items,
        }).catch(() => {});
      }
    }

    res.json({ data: sesion });
  })
);
