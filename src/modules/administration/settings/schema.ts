import { z } from "zod"

export const CURRENCIES = ["PEN", "USD"] as const
export type Currency = (typeof CURRENCIES)[number]

export const CURRENCY_LABELS: Record<Currency, string> = {
  PEN: "Soles (PEN)",
  USD: "Dólares (USD)",
}

/** Tasa en porcentaje, como texto decimal: "18", "18.00", "10.5". Nunca como fracción. */
const RATE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/
/** Serie de comprobante: 4 caracteres en mayúsculas o dígitos, por ejemplo "F001" */
const SERIES_PATTERN = /^[A-Z0-9]{4}$/

const seriesField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(SERIES_PATTERN, "Debe tener 4 caracteres: letras y números, sin espacios")

const settingsFields = z.object({
  company_ruc: z.string().trim().regex(/^\d{11}$/, "El RUC debe tener 11 dígitos"),
  company_name: z
    .string()
    .trim()
    .min(2, "Ingresa la razón social")
    .max(120, "Máximo 120 caracteres"),
  company_address: z.string().trim().max(200, "Máximo 200 caracteres"),
  igv_rate: z
    .string()
    .trim()
    .regex(RATE_PATTERN, "Tasa no válida, ejemplo: 18.00")
    .refine((value) => Number(value) <= 100, "La tasa no puede superar 100"),
  currency: z.enum(CURRENCIES),
  invoice_series: seriesField,
  receipt_series: seriesField,
  /** Regla 6 del manual: el stock nunca puede quedar negativo. En esta versión no se puede apagar. */
  block_negative_stock: z
    .boolean()
    .refine((value) => value === true, "En esta versión el stock no puede quedar negativo"),
})

/** Lo que envía el formulario (sin id: lo asigna el servidor). */
export const settingsInputSchema = settingsFields.superRefine((value, ctx) => {
  if (value.invoice_series === value.receipt_series) {
    ctx.addIssue({
      code: "custom",
      path: ["receipt_series"],
      message: "Debe ser distinta de la serie de facturas",
    })
  }
})

/** Lo que devuelve la API. */
export const settingsSchema = settingsFields.extend({ id: z.string() })

export type SettingsInput = z.infer<typeof settingsInputSchema>
export type Settings = z.infer<typeof settingsSchema>

/**
 * Valores vacíos para completar el formulario desde cero. La tasa de IGV queda vacía a propósito:
 * su valor vigente siempre viene del servidor, no se escribe a mano en el frontend.
 */
export const EMPTY_SETTINGS: SettingsInput = {
  company_ruc: "",
  company_name: "",
  company_address: "",
  igv_rate: "",
  currency: "PEN",
  invoice_series: "",
  receipt_series: "",
  block_negative_stock: true,
}

export function toSettingsInput(settings: Settings): SettingsInput {
  return {
    company_ruc: settings.company_ruc,
    company_name: settings.company_name,
    company_address: settings.company_address,
    igv_rate: settings.igv_rate,
    currency: settings.currency,
    invoice_series: settings.invoice_series,
    receipt_series: settings.receipt_series,
    block_negative_stock: settings.block_negative_stock,
  }
}