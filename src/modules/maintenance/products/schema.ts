import { z } from "zod"

export const PRODUCT_STATUSES = ["active", "inactive"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

/** Regla de precio: número positivo con máximo 2 decimales. */
const priceSchema = z
  .number({ message: "Ingresa un precio válido" })
  .min(0, "El precio no puede ser negativo")
  .refine(
    (val) => {
      const decimalPart = val.toString().split(".")[1]
      return !decimalPart || decimalPart.length <= 2
    },
    { message: "El precio debe tener máximo 2 decimales" }
  )

/** Campos editables comunes entre creación y actualización. */
const baseProductFields = {
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre del producto")
    .max(120, "Máximo 120 caracteres"),
  category_id: z.string().min(1, "Selecciona una categoría"),
  unit_price: priceSchema,
  status: z.enum(PRODUCT_STATUSES),
}

/** Esquema para CREAR producto (incluye código, NUNCA stock). */
export const productCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Ingresa el código del producto")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[A-Z0-9_-]+$/, "El código solo puede contener letras, números, guiones y guiones bajos"),
  ...baseProductFields,
})

/** Esquema para ACTUALIZAR producto (NO incluye código ni stock: el código es inmutable). */
export const productUpdateSchema = z.object({
  ...baseProductFields,
})

/** Compatibilidad hacia atrás para formularios genéricos. */
export const productInputSchema = productCreateSchema

/** Esquema del producto devuelto por la API (incluye id, stock calculado de solo lectura y category_name). */
export const productSchema = z.object({
  id: z.string(),
  code: z.string(),
  ...baseProductFields,
  category_name: z.string().optional(),
  stock: z.number().int().min(0),
})

export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
export type ProductInput = ProductCreateInput
export type Product = z.infer<typeof productSchema>

export const EMPTY_PRODUCT: ProductCreateInput = {
  code: "",
  name: "",
  category_id: "",
  unit_price: 0,
  status: "active",
}