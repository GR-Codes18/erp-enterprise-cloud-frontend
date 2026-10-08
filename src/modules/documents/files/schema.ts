import { z } from "zod"
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from "./fileRules"

export const DOCUMENT_CATEGORIES = ["invoice", "contract", "order", "receipt", "other"] as const
export const ENTITY_TYPES = ["sale", "purchase", "transfer", "adjustment", "payment"] as const

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]
export type EntityType = (typeof ENTITY_TYPES)[number]

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  invoice: "Factura",
  contract: "Contrato",
  order: "Orden",
  receipt: "Comprobante",
  other: "Otro",
}

export const ENTITY_LABELS: Record<EntityType, string> = {
  sale: "Venta",
  purchase: "Compra",
  transfer: "Transferencia",
  adjustment: "Ajuste",
  payment: "Pago",
}

/** Valor centinela de los filtros "todos": Radix Select no admite cadenas vacías como valor */
export const FILTER_ALL = "all"

const nameField = z
  .string()
  .trim()
  .min(2, "Ingresa el nombre del documento")
  .max(120, "Máximo 120 caracteres")

/** Lo que completa la persona en el formulario de subida (el archivo se valida aparte con validateFile). */
export const uploadFormSchema = z.object({
  name: nameField,
  category: z.enum(DOCUMENT_CATEGORIES),
})

export type UploadFormValues = z.infer<typeof uploadFormSchema>

export const EMPTY_UPLOAD_FORM: UploadFormValues = {
  name: "",
  category: "other",
}

/**
 * Metadatos que se envían en el paso 1 de la subida. El archivo en sí NO viaja aquí: va directo a S3.
 * entity_type y entity_id van juntos o ninguno (la relación la fija el DocumentsPanel de otros módulos).
 */
export const documentInputSchema = z
  .object({
    name: nameField,
    category: z.enum(DOCUMENT_CATEGORIES),
    entity_type: z.union([z.literal(""), z.enum(ENTITY_TYPES)]),
    entity_id: z.string().trim(),
    mime_type: z.enum(ALLOWED_MIME_TYPES),
    size: z
      .number()
      .int()
      .positive("El archivo está vacío")
      .max(MAX_FILE_SIZE_BYTES, `El archivo supera el máximo de ${MAX_FILE_SIZE_LABEL}`),
  })
  .superRefine((value, ctx) => {
    const hasType = value.entity_type !== ""
    const hasId = value.entity_id !== ""
    if (hasType !== hasId) {
      ctx.addIssue({
        code: "custom",
        path: [hasType ? "entity_id" : "entity_type"],
        message: "Indica el tipo y el registro relacionado, o ninguno",
      })
    }
  })

/** Lo que devuelve la API. Se llama DocumentRecord para no chocar con el tipo global Document del navegador. */
export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(DOCUMENT_CATEGORIES),
  entity_type: z.union([z.literal(""), z.enum(ENTITY_TYPES)]),
  entity_id: z.string(),
  /** Código legible del registro relacionado ("OC-2026-001"). "" si no tiene */
  entity_label: z.string(),
  mime_type: z.string(),
  size: z.number().int().nonnegative(),
  uploaded_by: z.string(),
  uploaded_by_name: z.string(),
  /** Fecha y hora UTC (ISO 8601). Se muestra con formatDateTimeLima */
  uploaded_at: z.string(),
})

export type DocumentInput = z.infer<typeof documentInputSchema>
export type DocumentRecord = z.infer<typeof documentSchema>

/** Respuesta del paso 1: el documento queda pendiente hasta confirmar la subida */
export interface UploadTicket {
  id: string
  /** URL temporal de S3 para subir el archivo con PUT */
  upload_url: string
}

/** Enlace temporal de descarga. Nunca se guarda ni se comparte */
export interface DownloadLink {
  url: string
  expires_in: number
}

/** Solo viajan al backend los filtros que la persona realmente eligió */
export function buildDocumentFilters(values: {
  category: string
  entity_type: string
}): Record<string, string> {
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