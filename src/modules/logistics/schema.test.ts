import { describe, expect, it } from "vitest"
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
