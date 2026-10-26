import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requestId } from './middlewares/requestId.js';
import { apiV1 } from './routes.js';

export function crearApp() {
  const app = express();

  // Detrás de un proxy (Nginx / Render / Fly) para que req.ip y secure cookies funcionen.
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(pinoHttp({ logger, customProps: (_req, res) => ({ requestId: res.getHeader('x-request-id') }) }));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'unreachable' });
    }
  });

  app.use('/api/v1', apiV1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
