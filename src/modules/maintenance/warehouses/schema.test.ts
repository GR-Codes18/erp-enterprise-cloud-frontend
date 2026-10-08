import { describe, expect, it } from "vitest"
import { EMPTY_WAREHOUSE, warehouseInputSchema, type WarehouseStatus } from "./schema"

describe("warehouseInputSchema", () => {
  it("valida un almacén correcto", () => {
    const validWarehouse = {
      ...EMPTY_WAREHOUSE,
      code: "ALM-001",
      name: "Almacén Central Principal",
      address: "Av. Industrial 123",
      status: "active" as const,
    }

    const result = warehouseInputSchema.safeParse(validWarehouse)
    expect(result.success).toBe(true)
  })

  it("rechaza un código demasiado corto (menos de 2 caracteres)", () => {
    const invalidWarehouse = {
      ...EMPTY_WAREHOUSE,
      code: "A",
      name: "Almacén Central",
    }

    const result = warehouseInputSchema.safeParse(invalidWarehouse)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Ingresa el código del almacén")
    }
  })

  it("rechaza un nombre demasiado corto (menos de 2 caracteres)", () => {
    const invalidWarehouse = {
      ...EMPTY_WAREHOUSE,
      code: "ALM-001",
      name: "X",
    }

    const result = warehouseInputSchema.safeParse(invalidWarehouse)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Ingresa el nombre del almacén")
    }
  })

  it("rechaza un estado inválido", () => {
    const invalidWarehouse = {
      ...EMPTY_WAREHOUSE,
      code: "ALM-001",
      name: "Almacén Central",
      status: "pending" as unknown as WarehouseStatus,
    }

    const result = warehouseInputSchema.safeParse(invalidWarehouse)
    expect(result.success).toBe(false)
  })
})