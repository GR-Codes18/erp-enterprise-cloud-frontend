import { z } from "zod"
import { findScreensWithoutView, PERMISSION_PATTERN } from "../../permissions/schema"

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
  /** Los roles de sistema (Administrador) no se editan ni se eliminan */
  is_system: z.boolean(),
})

export type Role = z.infer<typeof roleSchema>

export const roleInputSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre para el rol").max(80, "Máximo 80 caracteres"),
  description: z.string().trim().max(200, "Máximo 200 caracteres"),
  permissions: z
    .array(z.string().regex(PERMISSION_PATTERN, "Permiso con formato inválido"))
    .refine((permissions) => findScreensWithoutView(permissions).length === 0, {
      message: 'Cada pantalla con permisos debe incluir "Ver"',
    }),
})

export type RoleInput = z.infer<typeof roleInputSchema>

export const EMPTY_ROLE: RoleInput = {
  name: "",
  description: "",
  permissions: [],
}