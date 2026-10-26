import { z } from 'zod';

export const crearPedidoSchema = z.object({
  cliente: z.object({
    nombre: z.string().trim().min(2).max(80),
    telefono: z.string().trim().min(8).max(20),
    email: z.string().trim().toLowerCase().email().max(120).optional(),
    direccion: z.string().trim().max(160).optional(),
    comuna: z.string().trim().max(60).optional()
  }),
  items: z.array(z.object({
    productoId: z.string().cuid(),
    cantidad: z.number().int().min(1).max(50)
  })).min(1, 'El carrito está vacío').max(40),
  visitanteId: z.string().trim().max(60).optional(),
  notas: z.string().trim().max(500).optional()
});

export const listarPedidosSchema = z.object({
  estado: z.enum(['RECIBIDO', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'ANULADO']).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(25)
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(['RECIBIDO', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'ANULADO'])
});

export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;
export type ListarPedidosInput = z.infer<typeof listarPedidosSchema>;
