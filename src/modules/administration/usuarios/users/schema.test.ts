import { describe, expect, it } from "vitest"
import { EMPTY_USER, toUserInput, userInputSchema, type User } from "./schema"

const ROLE_ID = "00000000-0000-4000-8011-000000000001"

const valid = {
  name: "Ana Pérez",
  email: "ana.perez@enterprisecloud.example",
  role_id: ROLE_ID,
  status: "active",
}

const invalidFields = (input: unknown) => {
  const result = userInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("userInputSchema", () => {
  it("acepta datos válidos", () => {
    expect(userInputSchema.safeParse(valid).success).toBe(true)
  })

  it("normaliza el correo: sin espacios y en minúsculas", () => {
    const parsed = userInputSchema.parse({ ...valid, email: "  ANA.Perez@EnterpriseCloud.example " })
    expect(parsed.email).toBe("ana.perez@enterprisecloud.example")
  })

  it("quita espacios sobrantes del nombre", () => {
    expect(userInputSchema.parse({ ...valid, name: "  Ana Pérez  " }).name).toBe("Ana Pérez")
  })

  it("rechaza un nombre demasiado corto o demasiado largo", () => {
    expect(invalidFields({ ...valid, name: "A" })).toContain("name")
    expect(invalidFields({ ...valid, name: "x".repeat(121) })).toContain("name")
  })

  it("rechaza un correo vacío o con formato inválido", () => {
    expect(invalidFields({ ...valid, email: "" })).toContain("email")
    expect(invalidFields({ ...valid, email: "ana.perez" })).toContain("email")
    expect(invalidFields({ ...valid, email: "ana@" })).toContain("email")
  })

  it("exige un rol", () => {
    expect(invalidFields({ ...valid, role_id: "" })).toContain("role_id")
  })

  it("rechaza un estado desconocido", () => {
    expect(invalidFields({ ...valid, status: "blocked" })).toContain("status")
  })

  it("el formulario vacío no es válido: obliga a completar los datos", () => {
    const fields = invalidFields(EMPTY_USER)
    expect(fields).toContain("name")
    expect(fields).toContain("email")
    expect(fields).toContain("role_id")
  })
})

describe("toUserInput", () => {
  it("devuelve solo los campos editables, sin id", () => {
    const user: User = { id: "00000000-0000-4000-8010-000000000001", ...valid, status: "active" }
    expect(toUserInput(user)).toEqual(valid)
  })
})