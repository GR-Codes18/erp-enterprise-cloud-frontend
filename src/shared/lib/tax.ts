/**
 * Impuestos (Perú). Todos los montos son CENTAVOS ENTEROS.
 * Cualquier tope o regla de comprobantes también debe vivir aquí como constante.
 */

/** IGV como porcentaje entero (18 = 18 %). */
export const IGV_PERCENT = 18

function assertCents(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    // Error de programación (no de usuario): fallar fuerte es lo correcto.
    throw new RangeError(`Monto en centavos inválido: ${value}`)
  }
}

/** IGV sobre una base imponible, redondeo "half-up" con aritmética entera (sin decimales flotantes). */
export function calculateIgv(baseCents: number): number {
  assertCents(baseCents)
  return Math.floor((baseCents * IGV_PERCENT + 50) / 100)
}

export interface IgvTotals {
  subtotalCents: number
  igvCents: number
  totalCents: number
}

/** Totales de un documento: el IGV se calcula UNA vez sobre el subtotal, no línea por línea. */
export function calculateTotals(subtotalCents: number): IgvTotals {
  const igvCents = calculateIgv(subtotalCents)
  return { subtotalCents, igvCents, totalCents: subtotalCents + igvCents }
}
/** Base imponible de un total con IGV (redondeo half-up, aritmética entera): 11800 -> 10000 */
export function baseFromTotal(totalCents: number): number {
  assertCents(totalCents)
  return Math.floor((totalCents * 100 * 2 + (100 + IGV_PERCENT)) / (2 * (100 + IGV_PERCENT)))
}
