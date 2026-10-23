import { createCrudHandlers } from "@/mocks/utils/crud"
import { userId } from "../usuarios/users/mocks"
import type { AuditAction, AuditEvent, AuditModule, AuditResult } from "./schema"

/** UUID fijos con el prefijo de auditoría (8012) */
const uuid = (n: number) => `00000000-0000-4000-8012-${String(n).padStart(12, "0")}`

// [número de usuario en users/mocks.ts, nombre]
type Actor = readonly [number, string]
const ADMIN: Actor = [1, "Gabriel Romero"]
const RICARDO: Actor = [3, "Ricardo Salas Mendoza"]
const CARLA: Actor = [5, "Carla Mendoza Ruiz"]
const PEDRO: Actor = [8, "Pedro Campos Rivas"]
const ALAN: Actor = [10, "Alan Reyes Cabrera"]
const FIORELLA: Actor = [12, "Fiorella Gómez Ríos"]

const event = (
  n: number,
  actor: Actor,
  action: AuditAction,
  mod: AuditModule,
  record: string,
  result: AuditResult,
  created_at: string,
): AuditEvent => ({
  id: uuid(n),
  user_id: userId(actor[0]),
  user_name: actor[1],
  action,
  module: mod,
  record,
  result,
  created_at,
})

// Fechas en UTC, de la más reciente a la más antigua. 14 registros para ver la paginación con size=10
const seed: AuditEvent[] = [
  event(1, ADMIN, "update", "administration", "Rol: Encargado de Compras", "success", "2026-10-07T15:02:10Z"),
  event(2, FIORELLA, "create", "finance", "Cobro: F001-00245", "success", "2026-10-07T14:40:00Z"),
  event(3, CARLA, "create", "sales", "Cotización: COT-0007", "success", "2026-10-07T14:15:30Z"),
  event(4, PEDRO, "approve", "purchases", "Solicitud: SC-1002", "failure", "2026-10-07T13:58:12Z"),
  event(5, ALAN, "create", "inventory", "Transferencia: TR-1203", "success", "2026-10-07T13:20:45Z"),
  event(6, RICARDO, "approve", "inventory", "Ajuste: AJ-0304", "success", "2026-10-07T12:47:03Z"),
  event(7, CARLA, "login", "auth", "", "success", "2026-10-07T12:30:00Z"),
  event(8, CARLA, "login", "auth", "", "failure", "2026-10-07T12:29:10Z"),
  event(9, ADMIN, "void", "sales", "Comprobante: F001-00231", "success", "2026-10-06T21:10:00Z"),
  event(10, ADMIN, "create", "administration", "Usuario: Diego Paredes Cruz", "success", "2026-10-06T20:35:20Z"),
  event(11, ALAN, "update", "maintenance", "Almacén: ALM-02", "success", "2026-10-06T19:05:00Z"),
  event(12, FIORELLA, "void", "finance", "Pago: PG-5002", "success", "2026-10-06T16:45:00Z"),
  event(13, RICARDO, "login", "auth", "", "success", "2026-10-06T15:12:00Z"),
  event(14, PEDRO, "delete", "documents", "Documento: Contrato-2026.pdf", "success", "2026-10-05T13:00:00Z"),
]

export const auditHandlers = createCrudHandlers<AuditEvent>({
  resource: "audit",
  seed,
  searchFields: ["user_name", "record"],
  filterFields: ["user_id", "module", "action", "result"],
  dateField: "created_at",
})