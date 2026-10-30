import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "El correo electrónico es requerido" })
    .pipe(z.email({ message: "Ingresa un correo electrónico válido" })),
  password: z.string().min(1, { message: "La contraseña es requerida" }),
})

export type LoginCredentials = z.infer<typeof loginSchema>