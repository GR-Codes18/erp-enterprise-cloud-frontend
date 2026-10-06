/** Monedas soportadas. Para agregar una, solo se añade su código aquí. */
export type CurrencyCode = "PEN" | "USD"

export const DEFAULT_CURRENCY: CurrencyCode = "PEN"

const LOCALE = "es-PE"
const PLACEHOLDER = "—"

/** Texto decimal del contrato: "5000.00", "5000.5", "5000", "-12.50" (máx. 2 decimales). */
const AMOUNT_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

function assertSafeCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Los centavos deben ser un entero seguro, se recibió: ${cents}`)
  }
}

/** Convierte un monto en texto decimal a centavos enteros. Lanza error si el texto no es válido. */
export function toCents(amount: string): number {
  const match = AMOUNT_PATTERN.exec(amount)
  if (!match) throw new Error(`Monto inválido: "${amount}"`)

  const [, sign, whole, fraction = ""] = match
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
  assertSafeCents(cents)

  // sign && cents !== 0 evita que "-0.00" produzca -0
  return sign && cents !== 0 ? -cents : cents
}

/** Convierte centavos enteros a texto decimal con 2 decimales, listo para enviar al backend. */
export function fromCents(cents: number): string {
  assertSafeCents(cents)

  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const fraction = String(abs % 100).padStart(2, "0")
  return `${sign}${whole}.${fraction}`
}

// Crear un Intl.NumberFormat es costoso; se reutiliza uno por moneda
const formatters = new Map<CurrencyCode, Intl.NumberFormat>()

function getFormatter(currency: CurrencyCode): Intl.NumberFormat {
  let formatter = formatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency })
    formatters.set(currency, formatter)
  }
  return formatter
}

/** Formatea centavos para mostrar en pantalla: 500000 -> "S/ 5,000.00". */
export function formatCents(cents: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  assertSafeCents(cents)
  // Dividir entre 100 solo es seguro aquí porque el resultado es para mostrar, no para calcular
  return getFormatter(currency).format(cents / 100)
}

/** Formatea un monto en texto del backend: "5000.00" -> "S/ 5,000.00". Si el dato es inválido devuelve "—". */
export function formatMoney(amount: string, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  try {
    return formatCents(toCents(amount), currency)
  } catch {
    return PLACEHOLDER
  }
}