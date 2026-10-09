import { describe, expect, it } from "vitest"
import {
  ADJUSTMENT_REASONS,
  ADJUSTMENT_STATUSES,
  ADJUSTMENT_TRANSITIONS,
  adjustmentInputSchema,
  canTransitionAdjustment,
  EMPTY_ADJUSTMENT,
} from "./schema"

const valid = {
  warehouse_id: "00000000-0000-4000-8003-000000000001",
  items: [{ product_id: "00000000-0000-4000-8004-000000000001", direction: "increase", quantity: 3 }],
  reason: "physical_count",
  notes: "",
}

describe("adjustmentInputSchema", () => {
  it("acepta un ajuste válido con notas vacías", () => {
    expect(adjustmentInputSchema.safeParse(valid).success).toBe(true)
  })

  it("exige almacén, motivo y al menos un producto", () => {
    expect(adjustmentInputSchema.safeParse({ ...valid, warehouse_id: "" }).success).toBe(false)
    expect(adjustmentInputSchema.safeParse({ ...valid, reason: "unknown" }).success).toBe(false)
    expect(adjustmentInputSchema.safeParse({ ...valid, items: [] }).success).toBe(false)
  })

  it('un ajuste nuevo parte sin motivo y "" pide elegirlo', () => {
    expect(EMPTY_ADJUSTMENT.reason).toBe("")
    const result = adjustmentInputSchema.safeParse({ ...valid, reason: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.find((issue) => issue.path[0] === "reason")?.message).toBe(
        "Selecciona un motivo",
      )
    }
  })

  it("acepta cantidades enteras positivas y rechaza las demás", () => {
    expect(adjustmentInputSchema.safeParse(valid).success).toBe(true)
    for (const quantity of [0, -1, 2.5]) {
      expect(adjustmentInputSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity }] }).success).toBe(false)
    }
  })

  it("valida el tipo de movimiento, notas y productos duplicados", () => {
    expect(
      adjustmentInputSchema.safeParse({
        ...valid,
        items: [{ ...valid.items[0], direction: "sideways" }],
      }).success,
    ).toBe(false)
    expect(adjustmentInputSchema.safeParse({ ...valid, notes: "x".repeat(501) }).success).toBe(false)
    expect(
      adjustmentInputSchema.safeParse({
        ...valid,
        items: [...valid.items, { ...valid.items[0], quantity: 2 }],
      }).success,
    ).toBe(false)
  })
})

describe("transiciones de ajustes", () => {
  it("define etiquetas para todos los estados", () => {
    expect(Object.keys(ADJUSTMENT_TRANSITIONS).sort()).toEqual([...ADJUSTMENT_STATUSES].sort())
    expect(ADJUSTMENT_REASONS.length).toBeGreaterThan(0)
  })

  it("solo permite aplicar un borrador y mantiene los ajustes aplicados inmutables", () => {
    expect(canTransitionAdjustment("draft", "applied")).toBe(true)
    expect(canTransitionAdjustment("applied", "draft")).toBe(false)
    expect(canTransitionAdjustment("applied", "applied")).toBe(false)
  })
})
