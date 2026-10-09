import { describe, expect, it } from 'vitest'
import { IGV_PERCENT, baseFromTotal, calculateIgv, calculateTotals } from './tax'

describe('IGV_PERCENT', () => {
  it('es 18', () => {
    expect(IGV_PERCENT).toBe(18)
  })
})

describe('calculateIgv', () => {
  it('calcula montos exactos', () => {
    expect(calculateIgv(0)).toBe(0)
    expect(calculateIgv(1000)).toBe(180)
    expect(calculateIgv(10000)).toBe(1800)
  })
  it('redondea half-up', () => {
    expect(calculateIgv(1)).toBe(0) // 0.18
    expect(calculateIgv(3)).toBe(1) // 0.54
    expect(calculateIgv(25)).toBe(5) // 4.50 -> 5
  })
  it('rechaza valores inválidos', () => {
    expect(() => calculateIgv(-1)).toThrow(RangeError)
    expect(() => calculateIgv(1.5)).toThrow(RangeError)
    expect(() => calculateIgv(Number.NaN)).toThrow(RangeError)
  })
})

describe('calculateTotals', () => {
  it('suma subtotal + IGV', () => {
    expect(calculateTotals(10000)).toEqual({
      subtotalCents: 10000,
      igvCents: 1800,
      totalCents: 11800,
    })
  })
})
describe('baseFromTotal', () => {
  it('quita el IGV de un total', () => {
    expect(baseFromTotal(11800)).toBe(10000)
    expect(baseFromTotal(121894)).toBe(103300)
  })

  it('es la inversa de calculateTotals con redondeo half-up', () => {
    for (const base of [1, 99, 12345, 100000]) {
      expect(baseFromTotal(calculateTotals(base).totalCents)).toBe(base)
    }
  })
})
