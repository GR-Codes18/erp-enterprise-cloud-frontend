import { describe, expect, it } from "vitest"
import { periodRange } from "./periods"

describe("periodRange", () => {
  const today = "2026-10-08"

  it("este mes va del día 1 a hoy", () => {
    expect(periodRange("month", today)).toEqual({ date_from: "2026-10-01", date_to: today })
  })

  it("los últimos 90 días incluyen hoy", () => {
    expect(periodRange("quarter", today)).toEqual({ date_from: "2026-07-11", date_to: today })
  })

  it("este año va del 1 de enero a hoy", () => {
    expect(periodRange("year", today)).toEqual({ date_from: "2026-01-01", date_to: today })
  })
})
