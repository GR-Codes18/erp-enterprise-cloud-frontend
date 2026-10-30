import { describe, expect, it } from "vitest"
import { commissionsModule } from "./index"
import {
  commissionOperationInputSchema,
  commissionOperations,
  type CommissionOperation,
  type CommissionOperationField,
} from "./operations"

describe("commission operation screens", () => {
  it("publishes the seven seller commission submodules with screens", () => {
    const items = commissionsModule.sections?.flatMap((section) => section.items) ?? []

    expect(items.map((item) => item.label)).toEqual([
      "Reglas de comisión",
      "Escalas y excepciones",
      "Comisión generada",
      "Ajustes de comisión",
      "Liquidación",
      "Pago de comisión",
      "Historial y reporte",
    ])
    expect(items.every((item) => item.page !== undefined)).toBe(true)
  })

  it("accepts valid form data for every operational submodule", () => {
    const resources = Object.keys(commissionOperations) as CommissionOperation[]
    expect(resources).toHaveLength(5)

    for (const resource of resources) {
      const input = Object.fromEntries(
        (commissionOperations[resource].fields as CommissionOperationField[]).map((field) => [
          field.key,
          field.required === false
            ? ""
            : field.options?.[0]?.value
              ?? (field.type === "date" ? "2026-10-29"
                : field.type === "period" ? "2026-10"
                  : field.type === "money" || field.type === "percentage" || field.type === "number" ? "5.00"
                    : "Dato de prueba"),
        ]),
      )
      expect(commissionOperationInputSchema(resource).safeParse(input).success, resource).toBe(true)
    }
  })

  it("rejects malformed percentages, periods and money amounts", () => {
    const ruleSchema = commissionOperationInputSchema("rules")
    expect(ruleSchema.safeParse({
      code: "REG-001",
      name: "Regla de prueba",
      basis: "sales",
      rate_percentage: "150",
      applies_to: "Todos",
      effective_from: "2026-10-01",
      effective_to: "",
      status: "active",
    }).success).toBe(false)

    const adjustmentSchema = commissionOperationInputSchema("adjustments")
    expect(adjustmentSchema.safeParse({
      seller_name: "Ana Pérez",
      period: "2026-13",
      adjustment_type: "bonus",
      amount: "12,50",
      reason: "Prueba",
      status: "pending",
    }).success).toBe(false)
  })
})
