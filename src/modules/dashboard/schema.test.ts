import { describe, expect, it } from "vitest"
import { dashboardSchema, grossMarginPercent } from "./schema"

describe("grossMarginPercent", () => {
  it("calcula el margen con un decimal", () => {
    expect(grossMarginPercent(10000, 2500)).toBe(25)
    expect(grossMarginPercent(30000, 10000)).toBe(33.3)
  })

  it("sin ventas no hay margen (no divide entre cero)", () => {
    expect(grossMarginPercent(0, 0)).toBeNull()
  })

  it("una pérdida da margen negativo", () => {
    expect(grossMarginPercent(10000, -500)).toBe(-5)
  })
})

describe("dashboardSchema", () => {
  it("exige los indicadores y las alertas", () => {
    const valid = {
      date_from: "2026-10-01",
      date_to: "2026-10-08",
      sales: "1000.00",
      purchases: "500.00",
      cost_of_sales: "400.00",
      gross_profit: "300.00",
      gross_margin: "30.0",
      critical_stock_count: 2,
      receivables: { total: "100.00", overdue: "0.00" },
      payables: { total: "50.00", due_soon: "0.00" },
      inventory_turnover: "0.85",
      alerts: {
        low_stock: [],
        overdue_receivables: [],
        orders_to_invoice: [],
        pending_deliveries: [],
        purchase_orders_to_receive: [],
      },
    }
    expect(dashboardSchema.safeParse(valid).success).toBe(true)
    expect(dashboardSchema.safeParse({ ...valid, critical_stock_count: -1 }).success).toBe(false)
    expect(
      dashboardSchema.safeParse({
        ...valid,
        alerts: {
          ...valid.alerts,
          pending_deliveries: [{
            id: "delivery-1",
            number: "PED-0001",
            customer_name: "Cliente",
            method: "shipping",
            status: "delivered",
          }],
        },
      }).success,
    ).toBe(false)
  })
})
