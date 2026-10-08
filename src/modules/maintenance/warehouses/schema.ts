import { z } from "zod"

export const WAREHOUSE_STATUSES = ["active", "inactive"] as const
export type WarehouseStatus = (typeof WAREHOUSE_STATUSES)[number]

export const STATUS_LABELS: Record<WarehouseStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

const warehouseFields = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Ingresa el código del almacén")
    .max(20, "Máximo 20 caracteres"),
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre del almacén")
    .max(80, "Máximo 80 caracteres"),
  address: z
    .string()
    .trim()
    .max(150, "Máximo 150 caracteres")
    .optional()
    .or(z.literal("")),
  status: z.enum(WAREHOUSE_STATUSES),
})

/** Lo que envía el formulario (sin id: lo asigna el servidor). */
export const warehouseInputSchema = warehouseFields

/** Lo que devuelve la API. */
export const warehouseSchema = warehouseFields.extend({ id: z.string() })

export type WarehouseInput = z.infer<typeof warehouseInputSchema>
export type Warehouse = z.infer<typeof warehouseSchema>

export const EMPTY_WAREHOUSE: WarehouseInput = {
  code: "",
  name: "",
  address: "",
  status: "active",
}