import { describe, expect, it } from "vitest"
import { formatCents, formatCompactCents, formatMoney, fromCents, toCents } from "./money"

describe("toCents", () => {
  it.each([
    { amount: "5000.00", cents: 500000 },
    { amount: "0.10", cents: 10 },
    { amount: "0.1", cents: 10 },
    { amount: "5", cents: 500 },
    { amount: "-12.50", cents: -1250 },
    { amount: "0.00", cents: 0 },
  ])("convierte $amount a $cents centavos", ({ amount, cents }) => {
    expect(toCents(amount)).toBe(cents)
  })

  it("devuelve 0 y no -0 para '-0.00'", () => {
    // toBe usa Object.is, que distingue 0 de -0
    expect(toCents("-0.00")).toBe(0)
  })

  it.each(["", "abc", "1.234", "1,000.00", " 5.00", ".5", "5.", "--5", "9007199254740993"])(
    'rechaza el texto inválido "%s"',
    (bad) => {
      expect(() => toCents(bad)).toThrow()
    },
  )
})

describe("fromCents", () => {
  it.each([
    { cents: 500000, amount: "5000.00" },
    { cents: 5, amount: "0.05" },
    { cents: -1250, amount: "-12.50" },
    { cents: 0, amount: "0.00" },
  ])("convierte $cents centavos a $amount", ({ cents, amount }) => {
    expect(fromCents(cents)).toBe(amount)
  })

  it.each([1.5, NaN, Infinity])("rechaza %s (no es un entero seguro)", (bad) => {
    expect(() => fromCents(bad)).toThrow()
  })
})

describe("suma exacta", () => {
  it("evita el error clásico de los decimales", () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(fromCents(toCents("0.10") + toCents("0.20"))).toBe("0.30")
  })
})

describe("formatMoney y formatCents", () => {
  it("formatea soles por defecto", () => {
    const text = formatMoney("5000.00")
    expect(text).toContain("S/")
    expect(text).toContain("5,000.00")
  })

  it("acepta otra moneda", () => {
    // Solo se comprueba el número: el símbolo (USD, US$) depende de los datos de idioma del entorno
    expect(formatMoney("5000.00", "USD")).toContain("5,000.00")
  })

  it("devuelve un guion si el dato es inválido, sin lanzar error", () => {
    expect(formatMoney("basura")).toBe("—")
  })

  it("formatCents acepta centavos", () => {
    expect(formatCents(500000)).toContain("5,000.00")
  })
})
describe("formatCompactCents", () => {
  it("abrevia montos grandes sin perder la moneda", () => {
    const text = formatCompactCents(12_500_000)
    expect(text).toContain("S/")
    expect(text.length).toBeLessThan(formatCents(12_500_000).length)
  })
})
