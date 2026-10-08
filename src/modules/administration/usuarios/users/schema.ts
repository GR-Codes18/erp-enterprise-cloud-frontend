import { z } from "zod"

export const USER_STATUSES = ["active", "inactive"] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

const userFields = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre")
    .max(120, "Máximo 120 caracteres"),
  // El correo se normaliza (sin espacios y en minúsculas) para que no haya duplicados por mayúsculas
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Ingresa el correo")
    .max(120, "Máximo 120 caracteres")
    .pipe(z.email("Correo no válido")),
  role_id: z.string().min(1, "Selecciona un rol"),
  status: z.enum(USER_STATUSES),
})

/** Lo que envía el formulario (sin id: lo asigna el servidor). Nunca incluye contraseñas. */
export const userInputSchema = userFields

/** Lo que devuelve la API. */
export const userSchema = userFields.extend({ id: z.string() })

export type UserInput = z.infer<typeof userInputSchema>
export type User = z.infer<typeof userSchema>

export const EMPTY_USER: UserInput = {
  name: "",
  email: "",
  role_id: "",
  status: "active",
}

/** PUT envía siempre el recurso completo: sirve para el formulario y para activar/desactivar. */
export function toUserInput(user: User): UserInput {
  return {
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    status: user.status,
  }
}