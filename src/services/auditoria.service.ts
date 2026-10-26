import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

interface Entrada {
  usuarioId?: string;
  accion: string;
  entidad: string;
  entidadId: string;
  datos?: unknown;
}

/** Toda acción relevante deja rastro. Nunca rompe el flujo principal. */
export const auditoriaService = {
  async registrar(e: Entrada) {
    try {
      await prisma.auditoria.create({
        data: {
          usuarioId: e.usuarioId ?? null,
          accion: e.accion,
          entidad: e.entidad,
          entidadId: e.entidadId,
          datos: (e.datos ?? undefined) as never
        }
      });
    } catch (err) {
      logger.warn({ err }, 'No se pudo escribir la auditoría');
    }
  }
};
