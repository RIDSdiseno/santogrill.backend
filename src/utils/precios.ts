import { env } from '../config/env.js';

export interface Totales {
  subtotal: number;
  descuento: number;
  envio: number;
  total: number;
}

/**
 * Regla de negocio única para totales. El frontend los muestra,
 * pero el valor que vale es siempre el que calcula el servidor.
 */
export function calcularTotales(subtotal: number, suscriptor: boolean): Totales {
  const descuento = suscriptor ? Math.round(subtotal * env.DESCUENTO_SUSCRIPTOR) : 0;
  const envio = subtotal >= env.ENVIO_GRATIS_DESDE_CLP ? 0 : env.ENVIO_CLP;
  return { subtotal, descuento, envio, total: subtotal - descuento + envio };
}

export const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');
