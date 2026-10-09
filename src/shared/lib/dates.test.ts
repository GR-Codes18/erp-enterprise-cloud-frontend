import { describe, expect, it } from 'vitest'
import { addDays, formatBusinessDate, formatDateTimeLima, isBusinessDate, limaDayOf, todayInLima } from './dates'

describe('formatBusinessDate', () => {
  it('muestra la fecha sin conversión de zona', () => {
    expect(formatBusinessDate('2026-10-07')).toBe('07/10/2026')
    expect(formatBusinessDate('2026-12-31')).toBe('31/12/2026')
  })
  it('devuelve "" si está vacía', () => {
    expect(formatBusinessDate('')).toBe('')
  })
  it('devuelve el original si es inválida', () => {
    expect(formatBusinessDate('2026-02-30')).toBe('2026-02-30')
    expect(formatBusinessDate('2026-13-01')).toBe('2026-13-01')
    expect(formatBusinessDate('abc')).toBe('abc')
    expect(formatBusinessDate('2026-10-07T00:00:00Z')).toBe('2026-10-07T00:00:00Z')
  })
  it('acepta 29 de febrero solo en año bisiesto', () => {
    expect(formatBusinessDate('2028-02-29')).toBe('29/02/2028')
    expect(formatBusinessDate('2027-02-29')).toBe('2027-02-29')
  })
})

describe('formatDateTimeLima', () => {
  it('convierte UTC a hora de Lima (UTC-5)', () => {
    expect(formatDateTimeLima('2026-10-07T19:30:00Z')).toBe('07/10/2026 14:30')
  })
  it('cruza al día anterior', () => {
    expect(formatDateTimeLima('2026-10-07T03:00:00Z')).toBe('06/10/2026 22:00')
  })
  it('muestra 00:00 y no 24:00 a medianoche', () => {
    expect(formatDateTimeLima('2026-10-07T05:00:00Z')).toBe('07/10/2026 00:00')
  })
  it('acepta offsets y fracciones de segundo', () => {
    expect(formatDateTimeLima('2026-10-07T14:30:00-05:00')).toBe('07/10/2026 14:30')
    expect(formatDateTimeLima('2026-10-07T19:30:00.123Z')).toBe('07/10/2026 14:30')
  })
  it('devuelve "" si está vacía y el original si es inválida o sin zona', () => {
    expect(formatDateTimeLima('')).toBe('')
    expect(formatDateTimeLima('2026-10-07T14:30:00')).toBe('2026-10-07T14:30:00')
    expect(formatDateTimeLima('basura')).toBe('basura')
  })
})

describe('todayInLima', () => {
  it('usa el calendario de Lima, no el de UTC', () => {
    expect(todayInLima(new Date('2026-10-07T04:59:00Z'))).toBe('2026-10-06')
    expect(todayInLima(new Date('2026-10-07T05:00:00Z'))).toBe('2026-10-07')
  })
})
describe('limaDayOf', () => {
  it('una fecha de negocio queda igual', () => {
    expect(limaDayOf('2026-10-07')).toBe('2026-10-07')
  })

  it('una fecha-hora UTC de madrugada cae en el día anterior en Lima', () => {
    expect(limaDayOf('2026-10-08T03:00:00Z')).toBe('2026-10-07')
    expect(limaDayOf('2026-10-08T05:00:00Z')).toBe('2026-10-08')
  })

  it('respeta un offset explícito', () => {
    expect(limaDayOf('2026-10-07T23:30:00-05:00')).toBe('2026-10-07')
  })
})

describe('isBusinessDate', () => {
  it('acepta fechas reales AAAA-MM-DD', () => {
    expect(isBusinessDate('2026-02-28')).toBe(true)
    expect(isBusinessDate('2028-02-29')).toBe(true)
  })

  it('rechaza fechas imposibles o con otro formato', () => {
    expect(isBusinessDate('2026-02-30')).toBe(false)
    expect(isBusinessDate('07/10/2026')).toBe(false)
    expect(isBusinessDate('')).toBe(false)
  })
})

describe('addDays', () => {
  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-10-28', 7)).toBe('2026-11-04')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
