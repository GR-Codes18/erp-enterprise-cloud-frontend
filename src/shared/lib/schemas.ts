import { z } from "zod"
import { isBusinessDate } from "@/shared/lib/dates"

/** Fecha de negocio "AAAA-MM-DD" (sin hora ni zona). `message` se muestra junto al campo */
export const businessDateSchema = (message: string) => z.string().refine(isBusinessDate, message)

/** Notas opcionales: "" si no hay (regla 13), máximo 500 caracteres */
export const notesSchema = z.string().trim().max(500, "Máximo 500 caracteres")
