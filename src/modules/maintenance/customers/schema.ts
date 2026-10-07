import { z } from "zod"

export const DOCUMENT_TYPES = ["DNI", "RUC", "CE"] as const
export const CUSTOMER_STATUSES = ["active", "inactive"] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

const DOCUMENT_RULES: Record<DocumentType, { pattern: RegExp; message: string }> = {
  DNI: { pattern: /^\d{8}$/, message: "El DNI debe tener 8 dígitos" },
  RUC: { pattern: /^\d{11}$/, message: "El RUC debe tener 11 dígitos" },
  CE: { pattern: /^[A-Za-z0-9]{9,12}$/, message: "El carné de extranjería debe tener entre 9 y 12 caracteres" },
}

/** Monto en texto decimal del contrato: "1500", "1500.5", "1500.00" */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

const customerFields = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  document_number: z.string().trim(),
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre o razón social")
    .max(120, "Máximo 120 caracteres"),
  email: z.union([z.literal(""), z.email("Correo no válido")]),
  phone: z.string().trim().max(20, "Máximo 20 caracteres"),
  credit_limit: z.string().trim().regex(AMOUNT_PATTERN, "Monto no válido, ejemplo: 1500.00"),
  status: z.enum(CUSTOMER_STATUSES),
})

/** Lo que envía el formulario (sin id: lo asigna el servidor). */
export const customerInputSchema = customerFields.superRefine((value, ctx) => {
  const rule = DOCUMENT_RULES[value.document_type]
  if (!rule.pattern.test(value.document_number)) {
    ctx.addIssue({ code: "custom", path: ["document_number"], message: rule.message })
  }
})

/** Lo que devuelve la API. */
export const customerSchema = customerFields.extend({ id: z.string() })

export type CustomerInput = z.infer<typeof customerInputSchema>
export type Customer = z.infer<typeof customerSchema>

export const EMPTY_CUSTOMER: CustomerInput = {
  document_type: "DNI",
  document_number: "",
  name: "",
  email: "",
  phone: "",
  credit_limit: "0.00",
  status: "active",
}