import { z } from "zod"

export const DOCUMENT_TYPES = ["DNI", "RUC", "CE"] as const
export const SUPPLIER_STATUSES = ["active", "inactive"] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number]

export const STATUS_LABELS: Record<SupplierStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
}

const DOCUMENT_RULES: Record<DocumentType, { pattern: RegExp; message: string }> = {
  DNI: { pattern: /^\d{8}$/, message: "El DNI debe tener 8 dígitos" },
  RUC: { pattern: /^\d{11}$/, message: "El RUC debe tener 11 dígitos" },
  CE: { pattern: /^[A-Za-z0-9]{9,12}$/, message: "El carné de extranjería debe tener entre 9 y 12 caracteres" },
}

const supplierFields = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  document_number: z.string().trim(),
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre o razón social")
    .max(120, "Máximo 120 caracteres"),
  email: z.union([z.literal(""), z.email("Correo no válido")]),
  phone: z.string().trim().max(20, "Máximo 20 caracteres"),
  credit_days: z.coerce
    .number({ message: "Ingresa un número entero" })
    .int("Los días de crédito deben ser un número entero")
    .min(0, "Los días de crédito no pueden ser negativos"),
  status: z.enum(SUPPLIER_STATUSES),
})

/** Lo que envía el formulario (sin id: lo asigna el servidor). */
export const supplierInputSchema = supplierFields.superRefine((value, ctx) => {
  const rule = DOCUMENT_RULES[value.document_type]
  if (!rule.pattern.test(value.document_number)) {
    ctx.addIssue({ code: "custom", path: ["document_number"], message: rule.message })
  }
})

/** Lo que devuelve la API. */
export const supplierSchema = supplierFields.extend({ id: z.string() })

export type SupplierInput = z.infer<typeof supplierInputSchema>
export type Supplier = z.infer<typeof supplierSchema>

export const EMPTY_SUPPLIER: SupplierInput = {
  document_type: "RUC",
  document_number: "",
  name: "",
  email: "",
  phone: "",
  credit_days: 0,
  status: "active",
}