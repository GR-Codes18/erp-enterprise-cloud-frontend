import { z } from "zod"
import type { ConnectionRecord } from "./mock"

export const ENVIRONMENTS = ["Producción", "Pruebas / Sandbox"] as const
export const CONNECTION_STATES = ["Activo", "Inactivo", "Error"] as const

export const connectionFormSchema = z.object({
  proveedor: z.string().trim().min(2, "Ingresa el proveedor").max(60, "Máximo 60 caracteres"),
  servicio: z.string().trim().min(2, "Ingresa el servicio").max(80, "Máximo 80 caracteres"),
  ambiente: z.string().min(1, "Elige el ambiente"),
  // Solo la referencia al secreto (su nombre), nunca la clave en sí
  credenciales_referenciadas: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.*-]{3,60}$/, "Solo el nombre de la referencia (letras, números, _ . - *). Nunca la clave"),
  estado: z.string().min(1, "Elige el estado"),
})

export type ConnectionFormValues = z.infer<typeof connectionFormSchema>

/** Lo que recibe la API: la última respuesta la fija el servidor */
export type ConnectionInput = ConnectionFormValues

export const EMPTY_CONNECTION: ConnectionFormValues = {
  proveedor: "",
  servicio: "",
  ambiente: "",
  credenciales_referenciadas: "",
  estado: "Inactivo",
}

export const connectionToForm = (row: ConnectionRecord): ConnectionFormValues => ({
  proveedor: row.proveedor,
  servicio: row.servicio,
  ambiente: row.ambiente,
  credenciales_referenciadas: row.credenciales_referenciadas,
  estado: row.estado,
})
