import { createCrudHandlers } from "@/mocks/utils/crud"

/** UUID fijos con el prefijo de respaldos (8014) */
const uuid = (n: number) => `00000000-0000-4000-8014-${String(n).padStart(12, "0")}`

export interface BackupRecord {
  id: string;
  frecuencia: "Diaria" | "Semanal" | "Mensual";
  destino: string;
  ultima_ejecucion: string;
  resultado: "Exitoso" | "Fallido" | "En proceso";
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

export const backupsHandlers = createCrudHandlers<BackupRecord>({
  resource: "backups",
  seed,
  searchFields: ["destino", "politica_retencion"],
  filterFields: ["frecuencia", "resultado"],
  dateField: "ultima_ejecucion",
})