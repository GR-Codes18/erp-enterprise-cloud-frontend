import { z } from "zod"

/**
 * Base mínima para que Usuarios pueda elegir un rol.
 * El PR de Roles agrega aquí el schema de entrada (roleInputSchema) y la matriz de permisos.
 */
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
  permissions: z.array(z.string()),
})

export type RoleInput = z.infer<typeof roleInputSchema>

export const EMPTY_ROLE: RoleInput = {
  name: "",
  description: "",
  permissions: [],
}