import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/prisma.js', () => ({ prisma: { $queryRaw: async () => [] } }));

const { crearApp } = await import('../src/app.js');

describe('endpoints privados', () => {
  it('rechaza sin sesión', async () => {
    const res = await request(crearApp()).get('/api/v1/pedidos');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('valida el body del login', async () => {
    const res = await request(crearApp()).post('/api/v1/auth/login').send({ email: 'no-es-correo', clave: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
