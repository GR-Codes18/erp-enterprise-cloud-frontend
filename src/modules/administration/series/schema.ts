import { z } from "zod"
import type { DocumentSeries } from "./mock"

export const DOCUMENT_TYPES = [
  "Factura Electrónica",
  "Boleta de Venta",
  "Nota de Crédito",
  "Nota de Débito",
  "Guía de Remisión",
] as const

export const VIGENCIA_OPTIONS = [
  { value: "true", label: "Vigente" },
  { value: "false", label: "No vigente" },
]

/** Datos del formulario (todo texto: se convierte al enviar) */
export const seriesFormSchema = z.object({
  tipo_documento: z.string().min(1, "Elige el tipo de documento"),
  serie: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}$/, "La serie tiene 4 letras o números (ej. F001)"),
  sucursal_id: z.string().trim().min(2, "Ingresa la sucursal").max(20, "Máximo 20 caracteres"),
  correlativo: z.string().trim().regex(/^\d{1,8}$/, "Solo números, hasta 8 dígitos"),
  vigencia: z.enum(["true", "false"]),
})

export type SeriesFormValues = z.infer<typeof seriesFormSchema>

/** Lo que recibe la API */
export interface SeriesInput {
  tipo_documento: string
  serie: string
  sucursal_id: string
  correlativo: number
  vigencia: boolean
}

export const EMPTY_SERIES: SeriesFormValues = {
  tipo_documento: "",
  serie: "",
  sucursal_id: "",
  correlativo: "0",
  vigencia: "true",
}

export const seriesToForm = (row: DocumentSeries): SeriesFormValues => ({
  tipo_documento: row.tipo_documento,
  serie: row.serie,
  sucursal_id: row.sucursal_id,
  correlativo: String(row.correlativo),
  vigencia: row.vigencia ? "true" : "false",
})

export const seriesToInput = (values: SeriesFormValues): SeriesInput => ({
  tipo_documento: values.tipo_documento,
  serie: values.serie,
  sucursal_id: values.sucursal_id,
  correlativo: Number(values.correlativo),
  vigencia: values.vigencia === "true",
})
