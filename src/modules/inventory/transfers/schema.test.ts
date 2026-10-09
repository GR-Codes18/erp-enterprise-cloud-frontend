import { describe, expect, it } from "vitest"
import {
  TRANSFER_STATUSES,
  TRANSFER_TRANSITIONS,
  canTransitionTransfer,
  transferInputSchema,
} from "./schema"

const valid = {
  origin_warehouse_id: "00000000-0000-4000-8003-000000000001",
  destination_warehouse_id: "00000000-0000-4000-8003-000000000002",
  items: [{ product_id: "00000000-0000-4000-8004-000000000001", quantity: 3 }],
}

describe("transferInputSchema", () => {
  it("acepta una transferencia con almacenes diferentes y cantidad positiva", () => {
    expect(transferInputSchema.safeParse(valid).success).toBe(true)
  })

  it("rechaza origen y destino iguales", () => {
    expect(
      transferInputSchema.safeParse({ ...valid, destination_warehouse_id: valid.origin_warehouse_id }).success,
    ).toBe(false)
  })

  it.each([0, -1, 1.5])("rechaza cantidad %s", (quantity) => {
    expect(transferInputSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity }] }).success).toBe(false)
  })

  it("exige al menos un producto y no permite repetirlo", () => {
    expect(transferInputSchema.safeParse({ ...valid, items: [] }).success).toBe(false)
    expect(
      transferInputSchema.safeParse({
        ...valid,
        items: [...valid.items, { ...valid.items[0], quantity: 4 }],
      }).success,
    ).toBe(false)
  })
})

describe("transiciones de transferencias", () => {
  it("define etiquetas para todos los estados", () => {
    expect(Object.keys(TRANSFER_TRANSITIONS).sort()).toEqual([...TRANSFER_STATUSES].sort())
  })

  it("permite enviar, recibir y cancelar solo desde los estados definidos", () => {
    expect(canTransitionTransfer("draft", "in_transit")).toBe(true)
    expect(canTransitionTransfer("in_transit", "received")).toBe(true)
    expect(canTransitionTransfer("draft", "cancelled")).toBe(true)
    expect(canTransitionTransfer("in_transit", "cancelled")).toBe(false)
    expect(canTransitionTransfer("received", "in_transit")).toBe(false)
    expect(canTransitionTransfer("cancelled", "draft")).toBe(false)
  })
})
