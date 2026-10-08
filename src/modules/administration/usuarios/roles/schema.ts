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