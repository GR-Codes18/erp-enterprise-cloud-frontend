import { describe, expect, it } from "vitest"
import {
  REQUEST_STATUSES,
  REQUEST_TRANSITIONS,
  canDecideRequest,
  canTransitionRequest,
  emptyRequest,
  requestInputSchema,
} from "./schema"

const valid = {
  ...emptyRequest("2026-10-20"),
  items: [{ product_id: "p1", quantity: 10 }],
  justification: "Reposición de stock mínimo",
}

const invalidFields = (input: unknown) => {
  const result = requestInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("requestInputSchema", () => {
  it("acepta una solicitud válida", () => {
    expect(requestInputSchema.safeParse(valid).success).toBe(true)
  })

  it("exige justificación de al menos 10 caracteres, fecha y productos sin repetir", () => {
    expect(invalidFields({ ...valid, justification: "Falta" })).toContain("justification")
    expect(invalidFields({ ...valid, needed_by: "" })).toContain("needed_by")
    expect(invalidFields({ ...valid, items: [] })).toContain("items")
    expect(invalidFields({ ...valid, items: [valid.items[0], valid.items[0]] })).toContain("items")
  })
})

describe("REQUEST_TRANSITIONS", () => {
  it("borrador → pendiente → aprobada | rechazada", () => {
    expect(canTransitionRequest("draft", "pending")).toBe(true)
    expect(canTransitionRequest("pending", "approved")).toBe(true)
    expect(canTransitionRequest("pending", "rejected")).toBe(true)
    expect(canTransitionRequest("draft", "approved")).toBe(false)
    expect(canTransitionRequest("approved", "rejected")).toBe(false)
    for (const status of REQUEST_STATUSES) expect(REQUEST_TRANSITIONS[status]).toBeDefined()
  })
})

describe("canDecideRequest", () => {
  it("quien solicita no puede aprobar ni rechazar su propia solicitud", () => {
    expect(canDecideRequest({ status: "pending", requested_by: "u1" }, "u1")).toBe(false)
    expect(canDecideRequest({ status: "pending", requested_by: "u1" }, "u2")).toBe(true)
  })

  it("solo se decide una solicitud pendiente", () => {
    expect(canDecideRequest({ status: "draft", requested_by: "u1" }, "u2")).toBe(false)
    expect(canDecideRequest({ status: "pending", requested_by: "u1" }, undefined)).toBe(false)
  })
})
