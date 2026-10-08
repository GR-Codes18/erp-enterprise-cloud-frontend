import { describe, expect, it } from "vitest"
import {
  ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  AUDIT_RESULTS,
  FILTER_ALL,
  MODULE_LABELS,
  RESULT_LABELS,
  auditEventSchema,
  buildAuditFilters,
  isValidDateRange,
} from "./schema"

const valid = {
  id: "00000000-0000-4000-8012-000000000001",
  user_id: "00000000-0000-4000-8010-000000000001",
  user_name: "Administrador General",
  action: "update",
  module: "administration",
  record: "Rol: Encargado de Compras",
  result: "success",
  created_at: "2026-10-07T15:02:10Z",
}

describe("auditEventSchema", () => {
  it("acepta un evento válido", () => {
    expect(auditEventSchema.safeParse(valid).success).toBe(true)
  })

  it("acepta un registro afectado vacío (por ejemplo, inicio de sesión)", () => {
    expect(auditEventSchema.safeParse({ ...valid, action: "login", record: "" }).success).toBe(true)
  })

  it("rechaza una acción, módulo o resultado desconocidos", () => {
    expect(auditEventSchema.safeParse({ ...valid, action: "hack" }).success).toBe(false)
    expect(auditEventSchema.safeParse({ ...valid, module: "otro" }).success).toBe(false)
    expect(auditEventSchema.safeParse({ ...valid, result: "pending" }).success).toBe(false)
  })

  it("rechaza un evento sin usuario", () => {
    const { user_id: _omit, ...withoutUser } = valid
    expect(auditEventSchema.safeParse(withoutUser).success).toBe(false)
  })
})

describe("etiquetas", () => {
  it("toda acción, módulo y resultado tiene su etiqueta en español", () => {
    for (const action of AUDIT_ACTIONS) expect(ACTION_LABELS[action]).toBeTruthy()
    for (const mod of AUDIT_MODULES) expect(MODULE_LABELS[mod]).toBeTruthy()
    for (const result of AUDIT_RESULTS) expect(RESULT_LABELS[result]).toBeTruthy()
  })
})

describe("buildAuditFilters", () => {
  it("sin selección no envía ningún filtro", () => {
    expect(
      buildAuditFilters({ user_id: FILTER_ALL, module: FILTER_ALL, action: FILTER_ALL, result: FILTER_ALL }),
    ).toEqual({})
  })

  it("envía solo los filtros elegidos", () => {
    expect(
      buildAuditFilters({ user_id: FILTER_ALL, module: "sales", action: FILTER_ALL, result: "failure" }),
    ).toEqual({ module: "sales", result: "failure" })
  })
})

describe("isValidDateRange", () => {
  it("acepta rangos completos en orden y rangos abiertos", () => {
    expect(isValidDateRange("2026-10-01", "2026-10-07")).toBe(true)
    expect(isValidDateRange("2026-10-07", "2026-10-07")).toBe(true)
    expect(isValidDateRange("", "2026-10-07")).toBe(true)
    expect(isValidDateRange("2026-10-01", "")).toBe(true)
    expect(isValidDateRange("", "")).toBe(true)
  })

  it("rechaza desde posterior a hasta", () => {
    expect(isValidDateRange("2026-10-08", "2026-10-07")).toBe(false)
  })
})