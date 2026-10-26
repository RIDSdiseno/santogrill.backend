import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido').max(120),
  clave: z.string().min(8, 'Clave demasiado corta').max(100)
});

export type LoginInput = z.infer<typeof loginSchema>;
