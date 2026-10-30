import { describe, expect, it } from "vitest"
import { calculateCommission } from "./calculation"

describe("calculateCommission", () => {
  it("calculates fractional percentages using rounded integer cents", () => {
    expect(calculateCommission("19750.50", "5.25")).toBe("1036.90")
  })

  it("rounds half-cent results to the nearest cent", () => {
    expect(calculateCommission("0.10", "5")).toBe("0.01")
  })
})
