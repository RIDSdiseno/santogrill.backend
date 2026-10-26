import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/prisma.js', () => ({ prisma: { $queryRaw: async () => [{ '?column?': 1 }] } }));

const { crearApp } = await import('../src/app.js');

describe('GET /health', () => {
  it('responde ok cuando la base contesta', async () => {
    const res = await request(crearApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('rutas desconocidas', () => {
  it('devuelve el contrato de error estándar', async () => {
    const res = await request(crearApp()).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
