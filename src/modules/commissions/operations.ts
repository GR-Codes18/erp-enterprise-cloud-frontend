import { z } from "zod"

export interface CommissionOperationOption {
  value: string
  label: string
}

export interface CommissionOperationField {
  key: string
  label: string
  type: "text" | "date" | "period" | "number" | "money" | "percentage" | "select" | "textarea"
  required?: boolean
  allowNegative?: boolean
  options?: CommissionOperationOption[]
}

export interface CommissionOperationDefinition {
  title: string
  description: string
  createLabel: string
  searchPlaceholder: string
  fields: CommissionOperationField[]
  columns: string[]
}

const activeStatus: CommissionOperationOption[] = [
  { value: "active", label: "Activa" },
  { value: "inactive", label: "Inactiva" },
]

export const commissionOperations = {
  rules: {
    title: "Reglas de comisión",
    description: "Define cómo se calculan las comisiones y durante qué periodo aplica cada regla.",
    createLabel: "Crear regla",
    searchPlaceholder: "Buscar código, regla o vendedor",
    fields: [
      { key: "code", label: "Código", type: "text" },
      { key: "name", label: "Nombre de regla", type: "text" },
      {
        key: "basis",
        label: "Base de cálculo",
        type: "select",
        options: [
          { value: "sales", label: "Ventas facturadas" },
          { value: "collected", label: "Ventas cobradas" },
        ],
      },
      { key: "rate_percentage", label: "Porcentaje (%)", type: "percentage" },
      { key: "applies_to", label: "Aplicable a", type: "text" },
      { key: "effective_from", label: "Vigencia desde", type: "date" },
      { key: "effective_to", label: "Vigencia hasta", type: "date", required: false },
      { key: "status", label: "Estado", type: "select", options: activeStatus },
    ],
    columns: ["code", "name", "basis", "rate_percentage", "applies_to", "effective_from", "status"],
  },
  "scales-exceptions": {
    title: "Escalas y excepciones",
    description: "Configura rangos de ventas con tasas diferenciadas y excepciones por vendedor o producto.",
    createLabel: "Agregar escala o excepción",
    searchPlaceholder: "Buscar regla, rango o excepción",
    fields: [
      { key: "rule_code", label: "Código de regla", type: "text" },
      { key: "min_sales", label: "Venta mínima (S/)", type: "money" },
      { key: "max_sales", label: "Venta máxima (S/)", type: "money", required: false },
      { key: "rate_percentage", label: "Porcentaje (%)", type: "percentage" },
      {
        key: "exception_type",
        label: "Tipo de excepción",
        type: "select",
        options: [
          { value: "seller", label: "Vendedor" },
          { value: "product", label: "Producto" },
          { value: "customer", label: "Cliente" },
        ],
      },
      { key: "exception_value", label: "Valor de excepción", type: "text", required: false },
      { key: "effective_from", label: "Vigencia desde", type: "date" },
      { key: "status", label: "Estado", type: "select", options: activeStatus },
    ],
    columns: ["rule_code", "min_sales", "max_sales", "rate_percentage", "exception_type", "exception_value", "status"],
  },
  adjustments: {
    title: "Ajustes de comisión",
    description: "Registra bonificaciones o descuentos asociados a un vendedor y periodo.",
    createLabel: "Registrar ajuste",
    searchPlaceholder: "Buscar vendedor, periodo o motivo",
    fields: [
      { key: "seller_name", label: "Vendedor", type: "text" },
      { key: "period", label: "Periodo", type: "period" },
      {
        key: "adjustment_type",
        label: "Tipo de ajuste",
        type: "select",
        options: [
          { value: "bonus", label: "Bonificación" },
          { value: "deduction", label: "Descuento" },
        ],
      },
      { key: "amount", label: "Monto (S/)", type: "money" },
      { key: "reason", label: "Motivo", type: "textarea" },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: [
          { value: "pending", label: "Pendiente" },
          { value: "approved", label: "Aprobado" },
          { value: "rejected", label: "Rechazado" },
        ],
      },
    ],
    columns: ["seller_name", "period", "adjustment_type", "amount", "reason", "status"],
  },
  settlements: {
    title: "Liquidación",
    description: "Prepara y controla la liquidación de comisiones por vendedor y periodo.",
    createLabel: "Crear liquidación",
    searchPlaceholder: "Buscar vendedor o periodo",
    fields: [
      { key: "settlement_code", label: "Código de liquidación", type: "text" },
      { key: "seller_name", label: "Vendedor", type: "text" },
      { key: "period", label: "Periodo", type: "period" },
      { key: "commission_amount", label: "Comisión generada (S/)", type: "money" },
      { key: "adjustment_amount", label: "Ajustes (S/)", type: "money", allowNegative: true },
      { key: "net_amount", label: "Monto neto (S/)", type: "money" },
      { key: "settlement_date", label: "Fecha de liquidación", type: "date" },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: [
          { value: "draft", label: "Borrador" },
          { value: "approved", label: "Aprobada" },
          { value: "paid", label: "Pagada" },
        ],
      },
    ],
    columns: ["settlement_code", "seller_name", "period", "commission_amount", "adjustment_amount", "net_amount", "status"],
  },
  payments: {
    title: "Pago de comisión",
    description: "Registra pagos de liquidaciones y consulta su fecha, medio y referencia.",
    createLabel: "Registrar pago",
    searchPlaceholder: "Buscar liquidación, vendedor o referencia",
    fields: [
      { key: "settlement_code", label: "Código de liquidación", type: "text" },
      { key: "seller_name", label: "Vendedor", type: "text" },
      { key: "payment_date", label: "Fecha de pago", type: "date" },
      { key: "amount", label: "Monto (S/)", type: "money" },
      {
        key: "payment_method",
        label: "Medio de pago",
        type: "select",
        options: [
          { value: "transfer", label: "Transferencia" },
          { value: "cash", label: "Efectivo" },
          { value: "check", label: "Cheque" },
        ],
      },
      { key: "reference", label: "Referencia de pago", type: "text" },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: [
          { value: "pending", label: "Pendiente" },
          { value: "paid", label: "Pagado" },
          { value: "void", label: "Anulado" },
        ],
      },
    ],
    columns: ["settlement_code", "seller_name", "payment_date", "amount", "payment_method", "reference", "status"],
  },
} satisfies Record<string, CommissionOperationDefinition>

export type CommissionOperation = keyof typeof commissionOperations

export interface CommissionOperationRecord {
  id: string
  [key: string]: string
}

export type CommissionOperationInput = Omit<CommissionOperationRecord, "id">

export function getCommissionFieldLabel(definition: CommissionOperationDefinition, key: string): string {
  return definition.fields.find((field) => field.key === key)?.label ?? key
}

export function commissionOperationInputSchema(resource: CommissionOperation) {
  const shape: Record<string, z.ZodType> = {}
  const definition = commissionOperations[resource]

  for (const field of definition.fields as CommissionOperationField[]) {
    let valueSchema = z.string()
    if (field.required !== false) valueSchema = valueSchema.trim().min(1, `Ingresa ${field.label.toLowerCase()}`)
    if (field.type === "date") {
      valueSchema = valueSchema.refine(
        (value) => !value || z.iso.date().safeParse(value).success,
        "Ingresa una fecha válida",
      )
    }
    if (field.type === "period") valueSchema = valueSchema.regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Usa el formato AAAA-MM")
    if (field.type === "number") valueSchema = valueSchema.regex(/^\d+(\.\d+)?$/, "Ingresa un número válido")
    if (field.type === "money") {
      const amountPattern = field.allowNegative ? /^-?\d{1,8}(\.\d{1,2})?$/ : /^\d{1,8}(\.\d{1,2})?$/
      valueSchema = field.required === false
        ? valueSchema.refine((value) => !value || amountPattern.test(value), "Ingresa un monto válido")
        : valueSchema.regex(amountPattern, "Ingresa un monto válido")
    }
    if (field.type === "percentage") {
      valueSchema = valueSchema
        .regex(/^\d{1,3}(\.\d{1,2})?$/, "Ingresa un porcentaje válido")
        .refine((value) => Number(value) > 0 && Number(value) <= 100, "El porcentaje debe ser mayor que 0 y no superar 100")
    }
    if (field.type === "select" && field.options) {
      shape[field.key] = z.enum(field.options.map((option) => option.value) as [string, ...string[]])
    } else {
      shape[field.key] = valueSchema
    }
  }

  return z.object(shape)
}
