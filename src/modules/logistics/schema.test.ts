import { describe, expect, it } from "vitest"
import { logisticsModule } from "./index"
import { logisticsOperationInputSchema, logisticsOperations } from "./operations"
import { shipmentInputSchema } from "./schema"

describe("shipmentInputSchema", () => {
  it("accepts a valid scheduled delivery", () => {
    expect(shipmentInputSchema.safeParse({
      reference: "TR-001",
      transporter: "Carga del Sur",
      origin: "Lima",
      destination: "Cusco",
      scheduled_date: "2026-10-27",
      freight_amount: "250.50",
      status: "planned",
    }).success).toBe(true)
  })

  it("rejects malformed amounts and unknown statuses", () => {
    const result = shipmentInputSchema.safeParse({
      reference: "TR-001",
      transporter: "Carga del Sur",
      origin: "Lima",
      destination: "Cusco",
      scheduled_date: "2026-10-27",
      freight_amount: "-1",
      status: "unknown",
    })
    expect(result.success).toBe(false)
  })
})

describe("logistics operation schemas", () => {
  it("publishes all eight logistics submodules with screens", () => {
    const items = logisticsModule.sections?.flatMap((section) => section.items) ?? []

    expect(items.map((item) => item.label)).toEqual([
      "Planificación de despachos",
      "Programación de rutas",
      "Asignación de vehículos",
      "Asignación de conductores",
      "Seguimiento de entregas",
      "Confirmación de entrega",
      "Devoluciones en ruta",
      "Costos y liquidación de ruta",
    ])
    expect(items.every((item) => item.page !== undefined)).toBe(true)
  })

  it("defines the seven operational submodules with valid sample inputs", () => {
    const resources = Object.keys(logisticsOperations) as (keyof typeof logisticsOperations)[]
    expect(resources).toHaveLength(7)

    for (const resource of resources) {
      const input = Object.fromEntries(
        logisticsOperations[resource].fields.map((field) => [
          field.key,
          field.options?.[0]?.value ?? (field.type === "date" ? "2026-10-29" : field.type === "money" || field.type === "number" ? "0" : "Dato de prueba"),
        ]),
      )
      expect(logisticsOperationInputSchema(resource).safeParse(input).success, resource).toBe(true)
    }
  })

  it("rejects invalid dates, amounts and statuses", () => {
    const route = logisticsOperationInputSchema("route-scheduling")
    expect(route.safeParse({
      route_code: "RUT-001",
      route_name: "Lima - Cusco",
      origin: "Lima",
      destination: "Cusco",
      dispatch_date: "fecha",
      return_date: "",
      status: "unrecognized",
    }).success).toBe(false)

    const settlement = logisticsOperationInputSchema("route-costs-settlement")
    expect(settlement.safeParse({
      route_code: "RUT-001",
      settlement_date: "2026-10-29",
      fuel_cost: "-10.00",
      toll_cost: "20.00",
      other_cost: "0.00",
      settled_by: "Elena",
      status: "pending",
    }).success).toBe(false)
  })
})
