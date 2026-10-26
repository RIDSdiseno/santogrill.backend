import { Router } from 'express';
import { authRouter } from './modules/auth/auth.controller.js';
import { productosRouter } from './modules/productos/productos.controller.js';
import { pedidosRouter } from './modules/pedidos/pedidos.controller.js';
import { suscriptoresRouter } from './modules/suscriptores/suscriptores.controller.js';
import { visitasRouter } from './modules/visitas/visitas.controller.js';
import { mensajesRouter } from './modules/mensajes/mensajes.controller.js';
import { eventosRouter } from './modules/eventos/eventos.controller.js';
import { metricasRouter } from './modules/metricas/metricas.controller.js';
import { bannersRouter } from './modules/banners/banners.controller.js';
import { galeriaRouter } from './modules/galeria/galeria.controller.js';
import { pagosRouter } from './modules/pagos/pagos.controller.js';
import { reservasRouter } from './modules/reservas/reservas.controller.js';

/** Un único punto donde se ve el mapa completo de la API v1. */
export const apiV1 = Router();

apiV1.use('/auth', authRouter);
apiV1.use('/productos', productosRouter);
apiV1.use('/pedidos', pedidosRouter);
apiV1.use('/suscriptores', suscriptoresRouter);
apiV1.use('/visitas', visitasRouter);
apiV1.use('/mensajes', mensajesRouter);
apiV1.use('/eventos', eventosRouter);
apiV1.use('/metricas', metricasRouter);
apiV1.use('/banners', bannersRouter);
apiV1.use('/galeria', galeriaRouter);
apiV1.use('/pagos', pagosRouter);
apiV1.use('/reservas', reservasRouter);
