import { describe, expect, it } from "vitest"
import { statementQuerySchema } from "./schema"

const valid = { party_type: "customer", party_id: "c1", date_from: "2026-10-01", date_to: "2026-10-31" }

describe("statementQuerySchema", () => {
  it("acepta una consulta completa", () => {
    expect(statementQuerySchema.safeParse(valid).success).toBe(true)
  })

  it("exige a quién y un rango completo y ordenado", () => {
    expect(statementQuerySchema.safeParse({ ...valid, party_id: "" }).success).toBe(false)
    expect(statementQuerySchema.safeParse({ ...valid, date_from: "" }).success).toBe(false)
    const inverted = statementQuerySchema.safeParse({ ...valid, date_from: "2026-11-01" })
    expect(inverted.success).toBe(false)
    if (!inverted.success) expect(inverted.error.issues[0].path).toEqual(["date_to"])
  })

  it("solo clientes o proveedores", () => {
    expect(statementQuerySchema.safeParse({ ...valid, party_type: "employee" }).success).toBe(false)
  })
})
