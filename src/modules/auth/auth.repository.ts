import { prisma } from '../../config/prisma.js';

export const authRepository = {
  porEmail: (email: string) => prisma.usuario.findUnique({ where: { email } }),
  marcarAcceso: (id: string) => prisma.usuario.update({ where: { id }, data: { ultimoAcceso: new Date() } })
};
