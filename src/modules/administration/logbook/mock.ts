import { createCrudHandlers } from "@/mocks/utils/crud"
import { newId } from "@/shared/lib/id"

/** UUID fijos con el prefijo de bitácora (8016) */
const uuid = (n: number) => `00000000-0000-4000-8016-${String(n).padStart(12, "0")}`

export type LogbookResult = "Exitoso" | "Fallido"

/** 10.8 Historial de operación: operacion_id, usuario, acción, fecha_hora, resultado, IP_si_disponible */
export interface LogbookEntry {
  id: string;
  operacion_id: string;
  usuario: string;
  accion: string;
  fecha_hora: string;
  resultado: LogbookResult;
  /** Solo cuando el origen la informa */
  ip: string | null;
}

const entry = (
  n: number,
  usuario: string,
  accion: string,
  fecha_hora: string,
  resultado: LogbookResult,
  ip: string | null,
): LogbookEntry => ({
  id: uuid(n),
  operacion_id: `OP-${String(1000 + n)}`,
  usuario,
  accion,
  fecha_hora,
  resultado,
  ip,
})

const seed: LogbookEntry[] = [
  entry(1, "Gabriel Romero", "Emitir factura F001-001250", "2026-10-28T15:42:10Z", "Exitoso", "190.232.14.20"),
  entry(2, "Carla Mendoza Ruiz", "Aprobar orden de venta OV-0087", "2026-10-28T15:10:03Z", "Exitoso", "190.232.14.35"),
  entry(3, "Ricardo Salas Mendoza", "Confirmar recepción REC-0042", "2026-10-28T14:55:47Z", "Exitoso", "181.176.88.12"),
  entry(4, "Pedro Campos Rivas", "Anular boleta B001-004880", "2026-10-28T14:30:21Z", "Fallido", "181.176.88.40"),
  entry(5, "Alan Reyes Cabrera", "Registrar transferencia TR-0019", "2026-10-28T13:18:55Z", "Exitoso", null),
  entry(6, "Fiorella Gómez Ríos", "Crear cotización COT-0156", "2026-10-28T12:02:36Z", "Exitoso", "190.232.14.61"),
  entry(7, "Gabriel Romero", "Actualizar serie F001", "2026-10-27T22:47:09Z", "Exitoso", "190.232.14.20"),
  entry(8, "Carla Mendoza Ruiz", "Emitir nota de crédito FC01-000045", "2026-10-27T21:15:44Z", "Fallido", "190.232.14.35"),
  entry(9, "Ricardo Salas Mendoza", "Registrar ajuste de inventario AJ-0008", "2026-10-27T19:33:12Z", "Exitoso", null),
  entry(10, "Pedro Campos Rivas", "Registrar cobranza CB-0231", "2026-10-27T17:08:50Z", "Exitoso", "181.176.88.40"),
  entry(11, "Alan Reyes Cabrera", "Emitir guía de remisión GR-0112", "2026-10-26T16:25:30Z", "Exitoso", "181.176.88.77"),
  entry(12, "Fiorella Gómez Ríos", "Anular cotización COT-0149", "2026-10-26T15:50:18Z", "Exitoso", "190.232.14.61"),
]

// Referencia al arreglo vivo del CRUD: permite que otros módulos agreguen operaciones (ver mocks/integration)
let liveEntries: LogbookEntry[] = seed
let operationCounter = seed.length

/** Registra una operación en la bitácora (la más reciente primero). La llama la capa de integración. */
export function appendLogbookEntry(input: Omit<LogbookEntry, "id" | "operacion_id">): LogbookEntry {
  operationCounter += 1
  const created: LogbookEntry = { ...input, id: newId(), operacion_id: `OP-${1000 + operationCounter}` }
  liveEntries.unshift(created)
  return created
}

export const logbookHandlers = createCrudHandlers<LogbookEntry>({
  onChange: (items) => {
    liveEntries = items as LogbookEntry[]
  },
  resource: "logbook",
  seed,
  searchFields: ["operacion_id", "usuario", "accion", "ip"],
  filterFields: ["resultado"],
  dateField: "fecha_hora",
})
