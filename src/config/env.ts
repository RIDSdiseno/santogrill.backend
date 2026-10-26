import { z } from 'zod';

/**
 * Toda la configuración entra por variables de entorno y se valida al arrancar:
 * si falta algo, el proceso muere aquí y no en medio de una request.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  COOKIE_NAME: z.string().default('sg_session'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  DESCUENTO_SUSCRIPTOR: z.coerce.number().min(0).max(0.5).default(0.05),
  ENVIO_CLP: z.coerce.number().int().min(0).default(2990),
  ENVIO_GRATIS_DESDE_CLP: z.coerce.number().int().min(0).default(40000),
  MAIL_PROVIDER: z.enum(['none', 'resend', 'smtp']).default('none'),
  MAIL_FROM: z.string().default('pedidos@santogrill.cl'),
  MAIL_TO_EQUIPO: z.string().default('pedidos@santogrill.cl'),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  NOTIFICATION_EMAIL: z.string().optional()
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuración inválida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  isProd: parsed.data.NODE_ENV === 'production'
};
