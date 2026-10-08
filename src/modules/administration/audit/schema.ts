import { z } from "zod"

export const AUDIT_ACTIONS = [
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "void",
  "approve",
] as const
export const AUDIT_MODULES = [
  "auth",
  "administration",
  "maintenance",
  "sales",
  "purchases",
  "inventory",
  "finance",
  "documents",
] as const
export const AUDIT_RESULTS = ["success", "failure"] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]
export type AuditModule = (typeof AUDIT_MODULES)[number]
export type AuditResult = (typeof AUDIT_RESULTS)[number]

export const ACTION_LABELS: Record<AuditAction, string> = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  void: "Anular",
  approve: "Aprobar",
}

export const MODULE_LABELS: Record<AuditModule, string> = {
  auth: "Acceso",
  administration: "Administración",
  maintenance: "Mantenimiento",
  sales: "Ventas",
  purchases: "Compras",
  inventory: "Inventario",
  finance: "Finanzas",
  documents: "Documentos",
}

export const RESULT_LABELS: Record<AuditResult, string> = {
  success: "Éxito",
  failure: "Fallo",
}

/**
 * Evento de auditoría. Solo lectura: no existe schema de entrada porque el frontend nunca los crea.
 * user_name se guarda en el evento para que el historial no cambie si el usuario se renombra.
 */
export const auditEventSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  action: z.enum(AUDIT_ACTIONS),
  module: z.enum(AUDIT_MODULES),
  /** Registro afectado en texto legible ("Usuario: Ana Pérez"). "" si no aplica (inicio de sesión) */
  record: z.string(),
  result: z.enum(AUDIT_RESULTS),
  /** Fecha y hora UTC (ISO 8601). Se muestra con formatDateTimeLima */
  created_at: z.string(),
})

export type AuditEvent = z.infer<typeof auditEventSchema>

/** Valor centinela de los filtros "todos": Radix Select no admite cadenas vacías como valor */
export const FILTER_ALL = "all"

export interface AuditFilterValues {
  user_id: string
  module: string
  action: string
  result: string
}

/** Solo viajan al backend los filtros que el usuario realmente eligió */
export function buildAuditFilters(values: AuditFilterValues): Record<string, string> {
  const filters: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== FILTER_ALL && value !== "") filters[key] = value
  }
  return filters
}

/** Fechas AAAA-MM-DD. Un extremo vacío no restringe. El backend responde 422 si desde > hasta. */
export function isValidDateRange(from: string, to: string): boolean {
  if (from === "" || to === "") return true
  return from <= to
}