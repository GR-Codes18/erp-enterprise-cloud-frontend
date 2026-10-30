import { describe, expect, it } from "vitest"
import { EMPTY_CUSTOMER, customerInputSchema, customerSchema, type CustomerInput } from "./schema"

const VALID: CustomerInput = {
  document_type: "RUC",
  document_number: "20100000001",
  name: "Comercial Andina S.A.C.",
  address: "Av. Los Álamos 123, Lima",
  email: "ventas@andina.example",
  phone: "014000001",
  credit_limit: "5000.00",
  status: "active",
}

/** Mensaje de error por campo. Vacío si la entrada es válida. */
function errorsOf(input: unknown): Record<string, string> {
  const result = customerInputSchema.safeParse(input)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  )
}

describe("customerInputSchema", () => {
  it("acepta un cliente válido", () => {
    expect(customerInputSchema.safeParse(VALID).success).toBe(true)
  })

  describe("documento según su tipo", () => {
    it("DNI de 8 dígitos es válido", () => {
      expect(errorsOf({ ...VALID, document_type: "DNI", document_number: "70000003" })).toEqual({})
    })

    it("DNI de 3 dígitos se rechaza con su mensaje", () => {
      const errors = errorsOf({ ...VALID, document_type: "DNI", document_number: "123" })
      expect(errors.document_number).toBe("El DNI debe tener 8 dígitos")
    })

    it("un número de 8 dígitos no sirve como RUC", () => {
      const errors = errorsOf({ ...VALID, document_type: "RUC", document_number: "70000003" })
      expect(errors.document_number).toBe("El RUC debe tener 11 dígitos")
    })

    it("CE acepta de 9 a 12 caracteres alfanuméricos", () => {
      expect(errorsOf({ ...VALID, document_type: "CE", document_number: "001234567" })).toEqual({})
      expect(errorsOf({ ...VALID, document_type: "CE", document_number: "AB12" })).toHaveProperty(
        "document_number",
      )
    })

    it("quita los espacios alrededor del número antes de validar", () => {
      const result = customerInputSchema.safeParse({
        ...VALID,
        document_type: "DNI",
        document_number: "  70000003  ",
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.document_number).toBe("70000003")
    })
  })

  describe("nombre, correo y teléfono", () => {
    it("rechaza un nombre de un solo carácter", () => {
      expect(errorsOf({ ...VALID, name: "A" }).name).toBe("Ingresa el nombre o razón social")
    })

    it("recorta y limita la dirección principal", () => {
      const result = customerInputSchema.safeParse({ ...VALID, address: "  Av. Principal 123  " })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.address).toBe("Av. Principal 123")
      expect(errorsOf({ ...VALID, address: "a".repeat(251) })).toHaveProperty("address")
    })

    it("el correo puede estar vacío, pero si se escribe debe ser válido", () => {
      expect(errorsOf({ ...VALID, email: "" })).toEqual({})
      expect(errorsOf({ ...VALID, email: "abc" })).toHaveProperty("email")
    })

    it("rechaza un teléfono de más de 20 caracteres", () => {
      expect(errorsOf({ ...VALID, phone: "9".repeat(21) })).toHaveProperty("phone")
    })
  })

  describe("límite de crédito", () => {
    it.each(["0", "1500", "1500.5", "1500.00"])("acepta %s", (credit_limit) => {
      expect(errorsOf({ ...VALID, credit_limit })).toEqual({})
    })

    it.each(["abc", "", "-5", "1,500.00", "1500.123"])('rechaza "%s"', (credit_limit) => {
      expect(errorsOf({ ...VALID, credit_limit }).credit_limit).toBe(
        "Monto no válido, ejemplo: 1500.00",
      )
    })
  })

  it("rechaza un estado que no existe", () => {
    expect(errorsOf({ ...VALID, status: "pending" })).toHaveProperty("status")
  })

  it("el formulario vacío inicial no pasa: faltan documento y nombre", () => {
    const errors = errorsOf(EMPTY_CUSTOMER)
    expect(errors).toHaveProperty("document_number")
    expect(errors).toHaveProperty("name")
  })
})

describe("customerSchema (respuesta de la API)", () => {
  it("exige el id", () => {
    expect(customerSchema.safeParse(VALID).success).toBe(false)
    expect(customerSchema.safeParse({ ...VALID, id: "00000000-0000-4000-8000-000000000001" }).success).toBe(true)
  })
})