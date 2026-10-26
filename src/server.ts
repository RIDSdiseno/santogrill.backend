import { crearApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const app = crearApp();
const server = app.listen(env.PORT, () => {
  logger.info('API Santo Grill escuchando en http://localhost:' + env.PORT);
});

/** Apagado ordenado: deja terminar las requests en curso y cierra la DB. */
async function apagar(signal: string) {
  logger.info({ signal }, 'Apagando servidor');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void apagar('SIGTERM'));
process.on('SIGINT', () => void apagar('SIGINT'));
