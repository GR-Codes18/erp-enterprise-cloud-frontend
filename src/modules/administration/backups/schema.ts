import { z } from "zod"
import type { BackupRecord } from "./mock"

export const BACKUP_FREQUENCIES = ["Diaria", "Semanal", "Mensual"] as const

export const backupFormSchema = z.object({
  frecuencia: z.string().min(1, "Elige la frecuencia"),
  destino: z
    .string()
    .trim()
    .regex(/^(s3|gs|az|sftp):\/\/\S+$/i, "Usa una ruta como s3://bucket/carpeta/ (también gs://, az:// o sftp://)"),
  politica_retencion: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^\d{1,4} (días|semanas|meses|años)$/, "Usa un número y una unidad, ej. 30 días"),
})

export type BackupFormValues = z.infer<typeof backupFormSchema>

/** Lo que recibe la API: la última ejecución y el resultado los fija el servidor */
export type BackupInput = BackupFormValues

export const EMPTY_BACKUP: BackupFormValues = { frecuencia: "", destino: "", politica_retencion: "" }

export const backupToForm = (row: BackupRecord): BackupFormValues => ({
  frecuencia: row.frecuencia,
  destino: row.destino,
  politica_retencion: row.politica_retencion,
})
