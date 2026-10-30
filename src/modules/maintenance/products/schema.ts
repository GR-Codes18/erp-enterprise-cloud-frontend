import { z } from "zod"
import { toCents } from "@/shared/lib/money"

export const PRODUCT_STATUSES = ["active", "inactive"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

/** Unidades de medida. Para agregar una, solo se añade aquí con su etiqueta */
export const PRODUCT_UNITS = ["UND", "KG", "LT", "M", "CAJA", "BOLSA", "PAQ"] as const
export type ProductUnit = (typeof PRODUCT_UNITS)[number]

export const UNIT_LABELS: Record<ProductUnit, string> = {
  UND: "Unidad (UND)",
  KG: "Kilogramo (KG)",
  LT: "Litro (LT)",
  M: "Metro (M)",
  CAJA: "Caja",
  BOLSA: "Bolsa",
  PAQ: "Paquete (PAQ)",
}

/** Monto en texto decimal del contrato, >= 0 y con máximo 2 decimales: "45.50", "45.5", "45" */
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/

const priceSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Ingresa el ${label}`)
    .regex(PRICE_PATTERN, `${label[0].toUpperCase()}${label.slice(1)} no válido, ejemplo: 45.50`)

const SKU_PATTERN = /^[A-Z0-9_-]+$/

/** Campos editables comunes entre creación y edición */
const editableFields = {
  name: z.string().trim().min(2, "Ingresa el nombre del producto").max(120, "Máximo 120 caracteres"),
  category_id: z.string().min(1, "Selecciona una categoría"),
  unit: z.string().trim().min(1, "Selecciona una unidad").max(20, "Máximo 20 caracteres"),
  sale_price: priceSchema("precio de venta"),
  cost_price: priceSchema("costo"),
  min_stock: z
    .number({ message: "Ingresa el stock mínimo" })
    .int("El stock mínimo debe ser un número entero")
    .min(0, "El stock mínimo no puede ser negativo"),
  status: z.enum(PRODUCT_STATUSES),
}

/** Crear: incluye el SKU (único, en mayúsculas). Nunca el stock: solo cambia por movimientos */
export const productCreateSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Ingresa el SKU del producto")
    .max(30, "Máximo 30 caracteres")
    .regex(SKU_PATTERN, "El SKU solo puede contener letras, números, guiones y guiones bajos"),
  ...editableFields,
})

/** Editar: el SKU es inmutable. La unidad se puede cambiar solo si no hay movimientos (409 del backend) */
export const productUpdateSchema = z.object(editableFields)

/** Lo que devuelve la API */
export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  ...editableFields,
  category_name: z.string(),
  /** Suma de existencias en todos los almacenes. Lo calcula el backend; solo lectura */
  stock_total: z.number().int().min(0),
})

export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
export type Product = z.infer<typeof productSchema>

export const EMPTY_PRODUCT: ProductCreateInput = {
  sku: "",
  name: "",
  category_id: "",
  unit: "UND",
  sale_price: "",
  cost_price: "",
  min_stock: 0,
  status: "active",
}

/**
 * Venta por debajo del costo: se advierte, no se bloquea (puede ser una liquidación).
 * Con montos inválidos no hay advertencia: de eso se encarga la validación del campo.
 */
export function isSoldBelowCost(salePrice: string, costPrice: string): boolean {
  if (!PRICE_PATTERN.test(salePrice.trim()) || !PRICE_PATTERN.test(costPrice.trim())) return false
  return toCents(salePrice.trim()) < toCents(costPrice.trim())
}

export function toProductUpdateInput(product: Product): ProductUpdateInput {
  return {
    name: product.name,
    category_id: product.category_id,
    unit: product.unit,
    sale_price: product.sale_price,
    cost_price: product.cost_price,
    min_stock: product.min_stock,
    status: product.status,
  }
}
