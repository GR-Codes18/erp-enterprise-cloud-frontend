import { describe, expect, it } from "vitest"
import {
  CURRENCIES,
  CURRENCY_LABELS,
  EMPTY_SETTINGS,
  settingsInputSchema,
  toSettingsInput,
  type Settings,
} from "./schema"

const valid = {
  company_ruc: "20600000001",
  company_name: "Enterprise Cloud S.A.C.",
  company_address: "Av. Javier Prado Este 1234, San Isidro, Lima",
  igv_rate: "18.00",
  currency: "PEN",
  invoice_series: "F001",
  receipt_series: "B001",
  block_negative_stock: true,
}

const invalidFields = (input: unknown) => {
  const result = settingsInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("settingsInputSchema", () => {
  it("acepta datos válidos", () => {
    expect(settingsInputSchema.safeParse(valid).success).toBe(true)
  })

  it("acepta una dirección vacía (opcional)", () => {
    expect(settingsInputSchema.safeParse({ ...valid, company_address: "" }).success).toBe(true)
  })

  it("exige un RUC de 11 dígitos", () => {
    expect(invalidFields({ ...valid, company_ruc: "123" })).toContain("company_ruc")
    expect(invalidFields({ ...valid, company_ruc: "2060000000A" })).toContain("company_ruc")
    expect(invalidFields({ ...valid, company_ruc: "206000000012" })).toContain("company_ruc")
  })

  it("rechaza una razón social corta o demasiado larga", () => {
    expect(invalidFields({ ...valid, company_name: "A" })).toContain("company_name")
    expect(invalidFields({ ...valid, company_name: "x".repeat(121) })).toContain("company_name")
  })

  it("acepta tasas de IGV como porcentaje en texto", () => {
    for (const rate of ["0", "18", "18.00", "10.5", "100"]) {
      expect(settingsInputSchema.safeParse({ ...valid, igv_rate: rate }).success).toBe(true)
    }
  })

  it("rechaza tasas de IGV inválidas o fuera de rango", () => {
    for (const rate of ["", "abc", "-1", "18.123", "100.01", "1000"]) {
      expect(invalidFields({ ...valid, igv_rate: rate })).toContain("igv_rate")
    }
  })

  it("rechaza una moneda desconocida", () => {
    expect(invalidFields({ ...valid, currency: "EUR" })).toContain("currency")
  })

  it("normaliza las series a mayúsculas y sin espacios", () => {
    const parsed = settingsInputSchema.parse({ ...valid, invoice_series: " f002 " })
    expect(parsed.invoice_series).toBe("F002")
  })

  it("rechaza series con formato inválido", () => {
    expect(invalidFields({ ...valid, invoice_series: "F01" })).toContain("invoice_series")
    expect(invalidFields({ ...valid, receipt_series: "B-01" })).toContain("receipt_series")
    expect(invalidFields({ ...valid, invoice_series: "" })).toContain("invoice_series")
  })

  it("exige series distintas para facturas y boletas", () => {
    expect(invalidFields({ ...valid, receipt_series: "F001" })).toContain("receipt_series")
  })

  it("no permite apagar el bloqueo de stock negativo", () => {
    expect(invalidFields({ ...valid, block_negative_stock: false })).toContain("block_negative_stock")
  })

  it("el formulario vacío exige completar los datos", () => {
    const fields = invalidFields(EMPTY_SETTINGS)
    expect(fields).toContain("company_ruc")
    expect(fields).toContain("company_name")
    expect(fields).toContain("igv_rate")
    expect(fields).toContain("invoice_series")
    expect(fields).toContain("receipt_series")
  })
})

describe("etiquetas y conversión", () => {
  it("toda moneda tiene su etiqueta", () => {
    for (const currency of CURRENCIES) expect(CURRENCY_LABELS[currency]).toBeTruthy()
  })

  it("toSettingsInput devuelve solo los campos editables, sin id", () => {
    const settings: Settings = {
      id: "00000000-0000-4000-8014-000000000001",
      ...valid,
      currency: "PEN",
    }
    expect(toSettingsInput(settings)).toEqual(valid)
  })
})