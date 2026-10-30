import { z } from "zod"
import { createCrudHandlers, type MockRuleError } from "@/mocks/utils/crud"
import {
  commissionOperationInputSchema,
  commissionOperations,
  type CommissionOperation,
  type CommissionOperationRecord,
} from "./operations"

const operationId = (number: number) =>
  `00000000-0000-4000-8021-${String(100 + number).padStart(12, "0")}`

const seeds: Record<CommissionOperation, CommissionOperationRecord[]> = {
  rules: [
    { id: operationId(1), code: "REG-001", name: "Comisión estándar", basis: "sales", rate_percentage: "5", applies_to: "Todos los vendedores", effective_from: "2026-01-01", effective_to: "", status: "active" },
    { id: operationId(2), code: "REG-002", name: "Ventas cobradas", basis: "collected", rate_percentage: "4.5", applies_to: "Canal mayorista", effective_from: "2026-06-01", effective_to: "", status: "active" },
  ],
  "scales-exceptions": [
    { id: operationId(3), rule_code: "REG-001", min_sales: "0.00", max_sales: "20000.00", rate_percentage: "4", exception_type: "seller", exception_value: "", effective_from: "2026-01-01", status: "active" },
    { id: operationId(4), rule_code: "REG-001", min_sales: "20000.01", max_sales: "", rate_percentage: "6", exception_type: "seller", exception_value: "", effective_from: "2026-01-01", status: "active" },
    { id: operationId(5), rule_code: "REG-002", min_sales: "0.00", max_sales: "", rate_percentage: "3.5", exception_type: "product", exception_value: "Línea promocional", effective_from: "2026-06-01", status: "active" },
  ],
  adjustments: [
    { id: operationId(6), seller_name: "Ana Pérez", period: "2026-10", adjustment_type: "bonus", amount: "250.00", reason: "Cumplimiento de meta mensual", status: "pending" },
    { id: operationId(7), seller_name: "Luis Ramírez", period: "2026-10", adjustment_type: "deduction", amount: "75.00", reason: "Devolución de pedido", status: "approved" },
  ],
  settlements: [
    { id: operationId(8), settlement_code: "LIQ-2026-009", seller_name: "María Torres", period: "2026-09", commission_amount: "1036.91", adjustment_amount: "0.00", net_amount: "1036.91", settlement_date: "2026-10-05", status: "paid" },
    { id: operationId(9), settlement_code: "LIQ-2026-010", seller_name: "Luis Ramírez", period: "2026-10", commission_amount: "1093.50", adjustment_amount: "-75.00", net_amount: "1018.50", settlement_date: "2026-10-29", status: "approved" },
  ],
  payments: [
    { id: operationId(10), settlement_code: "LIQ-2026-009", seller_name: "María Torres", payment_date: "2026-10-06", amount: "1036.91", payment_method: "transfer", reference: "TRX-8061001", status: "paid" },
    { id: operationId(11), settlement_code: "LIQ-2026-010", seller_name: "Luis Ramírez", payment_date: "2026-10-30", amount: "1018.50", payment_method: "transfer", reference: "PENDIENTE", status: "pending" },
  ],
}

function validateOperation(resource: CommissionOperation, next: unknown): MockRuleError | undefined {
  const parsed = commissionOperationInputSchema(resource).extend({ id: z.string().uuid() }).safeParse(next)
  if (parsed.success) return undefined

  return {
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Revisa los datos de comisiones.",
    errors: parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? ""),
      message: issue.message,
    })),
  }
}

export const commissionOperationHandlers = (Object.keys(commissionOperations) as CommissionOperation[]).flatMap((resource) => {
  const definition = commissionOperations[resource]
  return createCrudHandlers<CommissionOperationRecord>({
    resource: `commissions/operations/${resource}`,
    seed: seeds[resource],
    searchFields: definition.fields.map((field) => field.key),
    filterFields: ["status"],
    insertAt: "start",
    prepareCreate: (body) =>
      Object.fromEntries(definition.fields.map((field) => [field.key, String(body[field.key] ?? "").trim()])),
    prepareUpdate: (_current, body) =>
      Object.fromEntries(definition.fields.map((field) => [field.key, String(body[field.key] ?? "").trim()])),
    uniqueFields: resource === "rules" ? [{ field: "code", label: "código de regla" }] : [],
    validate: ({ next }) => (next ? validateOperation(resource, next) : undefined),
  })
})
