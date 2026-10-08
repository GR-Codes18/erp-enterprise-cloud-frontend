import { z } from "zod"

export const PRODUCT_STATUSES = ["active", "inactive"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

const productFields = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Ingresa el código del producto")
    .max(30, "Máximo 30 caracteres"),
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre del producto")
    .max(120, "Máximo 120 caracteres"),
  category_id: z
    .string()
    .min(1, "Selecciona una categoría"),
  unit_price: z
    .number({ message: "Ingresa un precio válido" })
    .min(0, "El precio no puede ser negativo"),
  stock: z
    .number({ message: "Ingresa una cantidad válida" })
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo"),
  status: z.enum(PRODUCT_STATUSES),
})

/** Lo que envía el formulario (sin id: lo asigna el servidor). */
export const productInputSchema = productFields

/** Lo que devuelve la API (incluye id y opcionalmente el nombre de la categoría para la tabla). */
export const productSchema = productFields.extend({
  id: z.string(),
  category_name: z.string().optional(),
})

export type ProductInput = z.infer<typeof productInputSchema>
export type Product = z.infer<typeof productSchema>

export const EMPTY_PRODUCT: ProductInput = {
  code: "",
  name: "",
  category_id: "",
  unit_price: 0,
  stock: 0,
  status: "active",
}