import rateLimit from 'express-rate-limit';

const json = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });

/** Endpoints públicos de escritura: formularios, suscripción, pedidos. */
export const limitePublico = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Demasiadas solicitudes. Intenta nuevamente en unos minutos.')
});

/** Login: ventana corta y límite bajo para frenar fuerza bruta. */
export const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Demasiados intentos de acceso. Espera 15 minutos.')
});

/** Telemetría de visitas: alto volumen, bajo valor por request. */
export const limiteVisitas = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
