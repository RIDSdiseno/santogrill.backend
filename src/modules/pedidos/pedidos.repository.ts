import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export const pedidosRepository = {
  porClaveIdem: (claveIdem: string) =>
    prisma.pedido.findUnique({ where: { claveIdem }, include: { items: true } }),

  crear: (data: Prisma.PedidoCreateInput) =>
    prisma.pedido.create({ data, include: { items: true } }),

  listar: (where: Prisma.PedidoWhereInput, skip: number, take: number) =>
    prisma.$transaction([
      prisma.pedido.findMany({ where, include: { items: true }, orderBy: { creadoEn: 'desc' }, skip, take }),
      prisma.pedido.count({ where })
    ]),

  porId: (id: string) => prisma.pedido.findUnique({ where: { id }, include: { items: true } }),

  cambiarEstado: (id: string, estado: Prisma.PedidoUpdateInput['estado']) =>
    prisma.pedido.update({ where: { id }, data: { estado } })
};
