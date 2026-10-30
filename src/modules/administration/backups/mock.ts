import { delay, http, HttpResponse } from "msw"
import { env } from "@/config/env"
import { createCrudHandlers } from "@/mocks/utils/crud"

/** UUID fijos con el prefijo de respaldos (8014) */
const uuid = (n: number) => `00000000-0000-4000-8014-${String(n).padStart(12, "0")}`

export interface BackupRecord {
  id: string;
  frecuencia: "Diaria" | "Semanal" | "Mensual";
  destino: string;
  ultima_ejecucion: string;
  resultado: "Exitoso" | "Fallido" | "En proceso" | "Pendiente";
  politica_retencion: string;
}

const seed: BackupRecord[] = [
  {
    id: uuid(1),
    frecuencia: "Diaria",
    destino: "s3://erp-backups-bucket/cloud/",
    ultima_ejecucion: "2026-10-23T02:00:00Z",
    resultado: "Exitoso",
    politica_retencion: "30 días",
  },
  {
    id: uuid(2),
    frecuencia: "Semanal",
    destino: "s3://erp-backups-bucket/weekly/",
    ultima_ejecucion: "2026-10-18T03:00:00Z",
    resultado: "Exitoso",
    politica_retencion: "90 días",
  },
]

// Referencia al arreglo vivo del CRUD, para la acción "Ejecutar ahora"
let liveBackups: BackupRecord[] = seed

const runBackupHandler = http.post(`${env.apiBaseUrl}/backups/:id/run`, async ({ params }) => {
  await delay(600)
  const index = liveBackups.findIndex((item) => item.id === params.id)
  if (index === -1) return HttpResponse.json({ code: "NOT_FOUND", message: "Recurso no encontrado" }, { status: 404 })
  const executed: BackupRecord = {
    ...liveBackups[index],
    ultima_ejecucion: new Date().toISOString(),
    resultado: "Exitoso",
  }
  liveBackups[index] = executed
  return HttpResponse.json(executed)
})

const crudHandlers = createCrudHandlers<BackupRecord>({
  onChange: (items) => {
    liveBackups = items as BackupRecord[]
  },
  insertAt: "start",
  // Un respaldo nuevo aún no se ejecutó: la fecha y el resultado los fija el servidor
  createdFields: { ultima_ejecucion: "", resultado: "Pendiente" },
  immutableFields: ["ultima_ejecucion", "resultado"],
  prepareCreate: (body) => ({
    frecuencia: body.frecuencia as BackupRecord["frecuencia"],
    destino: String(body.destino ?? "").trim(),
    politica_retencion: String(body.politica_retencion ?? "").trim().toLowerCase(),
  }),
  prepareUpdate: (_current, body) => ({
    frecuencia: body.frecuencia as BackupRecord["frecuencia"],
    destino: String(body.destino ?? "").trim(),
    politica_retencion: String(body.politica_retencion ?? "").trim().toLowerCase(),
  }),
  validate: ({ action, next, items }) => {
    if (action === "delete" || !next) return undefined
    const duplicated = items.some(
      (item) => item.id !== next.id && item.destino === next.destino && item.frecuencia === next.frecuencia,
    )
    if (!duplicated) return undefined
    const message = "Ya existe un respaldo con este destino y frecuencia"
    return { status: 409, code: "DUPLICATE", message, errors: [{ field: "destino", message }] }
  },
  resource: "backups",
  seed,
  searchFields: ["destino", "politica_retencion"],
  filterFields: ["frecuencia", "resultado"],
  dateField: "ultima_ejecucion",
})

// La acción propia va antes que el CRUD (misma ruta base)
export const backupsHandlers = [runBackupHandler, ...crudHandlers]