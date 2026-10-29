import { createCrudHandlers, type MockRuleError } from "@/mocks/utils/crud"
import { calculateCommission } from "./calculation"
import { commissionInputSchema, commissionSchema, type Commission } from "./schema"
import { commissionOperationHandlers } from "./operationsMocks"

const commissionId = (number: number) => `00000000-0000-4000-8021-${String(number).padStart(12, "0")}`

const commission = (
  number: number,
  seller_name: string,
  period: string,
  sales_amount: string,
  rate_percentage: string,
  status: Commission["status"],
): Commission => ({
  id: commissionId(number),
  seller_name,
  period,
  sales_amount,
  rate_percentage,
  commission_amount: calculateCommission(sales_amount, rate_percentage),
  status,
})

export const commissionSeed: Commission[] = [
  commission(1, "Ana Pérez", "2026-10", "18500.00", "5", "pending"),
  commission(2, "Luis Ramírez", "2026-10", "24300.00", "4.5", "approved"),
  commission(3, "María Torres", "2026-09", "19750.50", "5.25", "paid"),
]

function validationError(next: unknown): MockRuleError | undefined {
  const parsed = commissionSchema.safeParse(next)
  if (parsed.success) return undefined
  return {
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Revisa los datos de la comisión.",
    errors: parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? ""),
      message: issue.message,
    })),
  }
}

function calculatedFields(body: Record<string, unknown>) {
  const parsed = commissionInputSchema.safeParse(body)
  return {
    commission_amount: parsed.success
      ? calculateCommission(parsed.data.sales_amount, parsed.data.rate_percentage)
      : "",
  }
}

const generatedCommissionHandlers = createCrudHandlers<Commission>({
  resource: "commissions",
  seed: commissionSeed,
  searchFields: ["seller_name", "period"],
  filterFields: ["status", "period"],
  insertAt: "start",
  prepareCreate: calculatedFields,
  prepareUpdate: (_current, body) => calculatedFields(body),
  validate: ({ next }) => (next ? validationError(next) : undefined),
})

export const commissionHandlers = [...generatedCommissionHandlers, ...commissionOperationHandlers]
