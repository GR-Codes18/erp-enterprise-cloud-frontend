import { z } from "zod"

export const CATEGORY_STATUSES = ["active", "inactive"] as const
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number]

export const STATUS_LABELS: Record<CategoryStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

const categoryFields = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre de la categoría")
    .max(80, "Máximo 80 caracteres"),
  status: z.enum(CATEGORY_STATUSES),
})

/** Lo que envía el formulario (sin id: lo asigna el servidor). */
export const categoryInputSchema = categoryFields

/** Lo que devuelve la API. */
export const categorySchema = categoryFields.extend({ id: z.string() })

export type CategoryInput = z.infer<typeof categoryInputSchema>
export type Category = z.infer<typeof categorySchema>

export const EMPTY_CATEGORY: CategoryInput = {
  name: "",
  status: "active",
}