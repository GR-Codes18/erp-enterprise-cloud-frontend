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

  const valid = { ...EMPTY_WAREHOUSE, code: "ALM-001", name: "Almacén Central" }

  it("normaliza el código: sin espacios y en mayúsculas", () => {
    expect(warehouseInputSchema.parse({ ...valid, code: "  alm-01 " }).code).toBe("ALM-01")
  })

  it("rechaza un código con espacios o caracteres no permitidos", () => {
    expect(warehouseInputSchema.safeParse({ ...valid, code: "ALM 01" }).success).toBe(false)
    expect(warehouseInputSchema.safeParse({ ...valid, code: "ALM#01" }).success).toBe(false)
  })

  it("rechaza un código de más de 20 caracteres", () => {
    expect(warehouseInputSchema.safeParse({ ...valid, code: "A".repeat(21) }).success).toBe(false)
  })

  it('acepta la dirección vacía como "" y rechaza null', () => {
    expect(warehouseInputSchema.parse(valid).address).toBe("")
    expect(warehouseInputSchema.safeParse({ ...valid, address: null }).success).toBe(false)
  })

  it("rechaza una dirección de más de 150 caracteres", () => {
    expect(warehouseInputSchema.safeParse({ ...valid, address: "x".repeat(151) }).success).toBe(false)
  })
})