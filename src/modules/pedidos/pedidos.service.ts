import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { HttpError } from '../../utils/httpError.js';
import { calcularTotales } from '../../utils/precios.js';
import { mailService } from '../../services/mail.service.js';
import { auditoriaService } from '../../services/auditoria.service.js';
import { pedidosRepository } from './pedidos.repository.js';
import type { CrearPedidoInput, ListarPedidosInput } from './pedidos.schema.js';

const numeroPedido = () => 'SG-' + randomBytes(3).toString('hex').toUpperCase();

export const pedidosService = {
  /**
   * Crea el pedido calculando SIEMPRE los precios desde la base de datos.
   * El total que manda el navegador es informativo: nunca se confía en él.
   * Idempotente por Idempotency-Key para que un doble click no duplique ventas.
   */
  async crear(input: CrearPedidoInput, claveIdem?: string) {
    if (claveIdem) {
      const previo = await pedidosRepository.porClaveIdem(claveIdem);
      if (previo) return previo;
    }

    const ids = input.items.map((i) => i.productoId);
    const productos = await prisma.producto.findMany({ where: { id: { in: ids }, activo: true } });

    if (productos.length !== new Set(ids).size) {
      throw HttpError.badRequest('Hay productos no disponibles en el carrito');
    }

    const items = input.items.map((i) => {
      const p = productos.find((x) => x.id === i.productoId)!;
      if (p.stock !== null && p.stock < i.cantidad) {
        throw HttpError.conflict('Sin stock suficiente de ' + p.nombre);
      }
      return {
        productoId: p.id,
        nombreProducto: p.nombre,
        precioUnitario: p.precio,
        cantidad: i.cantidad
      };
    });

    const subtotal = items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0);
    const suscriptor = input.cliente.email
      ? await prisma.suscriptor.findUnique({ where: { email: input.cliente.email } })
      : null;
    const totales = calcularTotales(subtotal, Boolean(suscriptor?.activo));

    const data: Prisma.PedidoCreateInput = {
      numero: numeroPedido(),
      claveIdem: claveIdem ?? null,
      clienteNombre: input.cliente.nombre,
      clienteEmail: input.cliente.email ?? null,
      clienteFono: input.cliente.telefono,
      direccion: input.cliente.direccion ?? null,
      comuna: input.cliente.comuna ?? null,
      visitanteId: input.visitanteId ?? null,
      notas: input.notas ?? null,
      ...totales,
      ...(suscriptor ? { suscriptor: { connect: { id: suscriptor.id } } } : {}),
      items: { create: items }
    };

    const pedido = await pedidosRepository.crear(data);

    await auditoriaService.registrar({ accion: 'PEDIDO_CREADO', entidad: 'Pedido', entidadId: pedido.id });
    await mailService.avisarPedido(pedido);

    return pedido;
  },

  async listar(filtros: ListarPedidosInput) {
    const where: Prisma.PedidoWhereInput = {
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.desde || filtros.hasta
        ? { creadoEn: { ...(filtros.desde ? { gte: filtros.desde } : {}), ...(filtros.hasta ? { lte: filtros.hasta } : {}) } }
        : {})
    };
    const skip = (filtros.pagina - 1) * filtros.porPagina;
    const [items, total] = await pedidosRepository.listar(where, skip, filtros.porPagina);
    return { items, total, pagina: filtros.pagina, porPagina: filtros.porPagina };
  },

  async cambiarEstado(id: string, estado: CrearPedidoEstado, usuarioId: string) {
    const pedido = await pedidosRepository.porId(id);
    if (!pedido) throw HttpError.notFound('Pedido no encontrado');
    const actualizado = await pedidosRepository.cambiarEstado(id, estado);
    await auditoriaService.registrar({
      usuarioId, accion: 'PEDIDO_ESTADO', entidad: 'Pedido', entidadId: id,
      datos: { antes: pedido.estado, despues: estado }
    });
    return actualizado;
  }
};

type CrearPedidoEstado = 'RECIBIDO' | 'EN_PREPARACION' | 'DESPACHADO' | 'ENTREGADO' | 'ANULADO';
