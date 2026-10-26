# backend-api — Santo Grill

API REST en Node 24 + Express 5 + TypeScript + Prisma/PostgreSQL. Repositorio independiente del frontend: no comparte código con `frontend-react`, solo el contrato HTTP.

## Arranque local

```bash
cp .env.example .env          # define JWT_SECRET (48+ chars) y DATABASE_URL
docker compose up -d db       # PostgreSQL local
npm install
npx prisma migrate dev --name init
npm run seed                  # productos + usuarios del portal
npm run dev                   # http://localhost:4000
```

## Capas

```
Router → Controller → Service → Repository → Prisma → PostgreSQL
```

- **Controller**: HTTP puro (status, headers, cookies). No tiene reglas de negocio.
- **Service**: reglas de negocio (precios, descuentos, idempotencia, auditoría).
- **Repository**: única capa que habla con Prisma.
- **Middlewares**: request-id, logging, helmet, CORS, auth, validación Zod, rate limit.

## Endpoints v1

| Método | Ruta | Auth |
|---|---|---|
| POST | /api/v1/auth/login | público (rate limit 8/15min) |
| POST | /api/v1/auth/logout | — |
| GET | /api/v1/auth/me | sesión |
| GET | /api/v1/productos | público |
| POST | /api/v1/pedidos | público + Idempotency-Key |
| GET | /api/v1/pedidos | staff |
| PATCH | /api/v1/pedidos/:id | staff |
| POST/GET | /api/v1/suscriptores | público / staff |
| POST/GET | /api/v1/visitas | público / staff |
| POST/GET/PATCH | /api/v1/mensajes | público / staff |
| POST/GET/PATCH | /api/v1/eventos | público / staff |
| GET | /api/v1/metricas/resumen | staff |
| GET | /health | interno |

## Decisiones de seguridad

- Sesión en **cookie httpOnly + SameSite**, no en localStorage: inmune a robo por XSS.
- Claves con **Argon2id**; verificación en tiempo constante aunque el usuario no exista.
- **Zod** valida y normaliza todo input en el borde; el body se reemplaza por el dato parseado.
- **Precios calculados en el servidor** desde la tabla `Producto`: el navegador nunca fija el total.
- **Idempotency-Key** en la creación de pedidos: un doble click no genera dos ventas.
- **CORS explícito** por ambiente y `express.json({ limit: '100kb' })`.
- La IP de las visitas se guarda **hasheada**, nunca en claro.
- Toda acción sensible queda en la tabla `Auditoria`.

## Contrato de error

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos", "details": {}, "requestId": "..." } }
```

## Definition of Done

`npm run typecheck` · `npm test` · `npm run build` en verde, migración incluida y `.env.example` actualizado.
