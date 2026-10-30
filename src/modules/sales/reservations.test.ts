import { describe, expect, it } from "vitest"
import { getReservationSummary } from "./reservations"

describe("getReservationSummary", () => {
  it("marca como reservada una orden confirmada con stock suficiente", () => {
    const summary = getReservationSummary({
      status: "confirmed",
      items: [
        { product_id: "p1", warehouse_id: "w1", quantity: 5 },
        { product_id: "p2", warehouse_id: "w1", quantity: 3 },
      ],
      stockByKey: {
        "p1:w1": 12,
        "p2:w1": 8,
      },
    })

    expect(summary.isReserved).toBe(true)
    expect(summary.message).toContain("stock reservado")
  })

  it("detecta una orden sin reserva posible cuando faltan unidades", () => {
    const summary = getReservationSummary({
      status: "confirmed",
      items: [{ product_id: "p3", warehouse_id: "w1", quantity: 999 }],
      stockByKey: {
        "p3:w1": 2,
      },
    })

    expect(summary.isReserved).toBe(false)
    expect(summary.message).toContain("No se pudo reservar stock")
  })
})
