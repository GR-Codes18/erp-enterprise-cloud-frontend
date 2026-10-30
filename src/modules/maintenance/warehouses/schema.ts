import { z } from "zod"

export const WAREHOUSE_STATUSES = ["active", "inactive"] as const
export type WarehouseStatus = (typeof WAREHOUSE_STATUSES)[number]

export const STATUS_LABELS: Record<WarehouseStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Ingresa el código del almacén")
  .max(20, "Máximo 20 caracteres")
  .regex(/^[A-Z0-9_-]+$/, "El código solo puede contener letras, números, guiones y guiones bajos")

const nameSchema = z
  .string()
  .trim()
  .min(2, "Ingresa el nombre del almacén")
  .max(80, "Máximo 80 caracteres")

/** Opcional para el usuario, pero siempre texto: vacío es "", nunca null (regla 13) */
const addressSchema = z.string().trim().max(150, "Máximo 150 caracteres")

const statusSchema = z.enum(WAREHOUSE_STATUSES)

/** Esquema para crear almacén (código editable). */
export const warehouseCreateSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  address: addressSchema,
  status: statusSchema,
})

/** Alias de compatibilidad para pruebas unitarias. */
export const warehouseInputSchema = warehouseCreateSchema

/** Esquema para actualizar almacén (código inmutable). */
export const warehouseUpdateSchema = z.object({
  name: nameSchema,
  address: addressSchema,
  status: statusSchema,
})

/** Lo que devuelve la API. */
export const warehouseSchema = z.object({
  id: z.string(),
  code: codeSchema,
  name: nameSchema,
  address: addressSchema,
  status: statusSchema,
})

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>
export type WarehouseUpdateInput = z.infer<typeof warehouseUpdateSchema>
export type WarehouseInput = WarehouseCreateInput
export type Warehouse = z.infer<typeof warehouseSchema>

export const EMPTY_WAREHOUSE: WarehouseCreateInput = {
  code: "",
  name: "",
  address: "",
  status: "active",
}