import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: { DESCUENTO_SUSCRIPTOR: 0.05, ENVIO_CLP: 2990, ENVIO_GRATIS_DESDE_CLP: 40000 }
}));

const { calcularTotales } = await import('../src/utils/precios.js');

describe('calcularTotales', () => {
  it('cobra envío bajo el mínimo y sin descuento', () => {
    expect(calcularTotales(20000, false)).toEqual({ subtotal: 20000, descuento: 0, envio: 2990, total: 22990 });
  });

  it('aplica 5% al suscriptor', () => {
    expect(calcularTotales(20000, true)).toEqual({ subtotal: 20000, descuento: 1000, envio: 2990, total: 21990 });
  });

  it('libera el envío desde 40.000 (sobre el subtotal, no sobre el neto)', () => {
    const t = calcularTotales(40000, true);
    expect(t.envio).toBe(0);
    expect(t.total).toBe(38000);
  });
});
