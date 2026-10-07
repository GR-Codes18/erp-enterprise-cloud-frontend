/**
 * Utilidades de fechas.
 *
 * Dos tipos de valor, tratados distinto a propósito:
 * - Fecha de negocio solo-día ("2026-10-07"): se muestra tal cual, SIN zona horaria.
 * - Fecha-hora UTC ("2026-10-07T19:30:00Z"): se muestra en hora de Lima.
 *
 * Convención del proyecto: opcional vacío = "" (nunca null).
 * Ante un valor inválido NO lanzamos error (no rompe la pantalla):
 * devolvemos el valor original para que el problema sea visible.
 */

const LIMA_TIME_ZONE = 'America/Lima'

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
// Exige "Z" u offset (+hh:mm). Sin zona, JS lo interpretaría como hora local del navegador.
const DATE_TIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

// Se crea una sola vez: construir un Intl.DateTimeFormat es costoso.
// 'en-CA' + hourCycle 'h23' solo para obtener partes estables; el formato final lo armamos nosotros.
const limaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LIMA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23', // evita "24:00" a medianoche
})

function getLimaParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {}
  for (const part of limaFormatter.formatToParts(date)) {
    parts[part.type] = part.value
  }
  return parts
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  // Date.UTC corrige fechas imposibles (30 de febrero -> marzo); si cambia algo, era inválida.
  const d = new Date(Date.UTC(year, month - 1, day))
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  )
}

/** "2026-10-07" -> "07/10/2026". Sin conversión de zona horaria. */
export function formatBusinessDate(value: string): string {
  if (!value) return ''
  const match = DATE_ONLY_RE.exec(value)
  if (!match) return value
  const [, y, m, d] = match
  if (!isRealCalendarDate(Number(y), Number(m), Number(d))) return value
  return `${d}/${m}/${y}`
}

/** "2026-10-07T19:30:00Z" -> "07/10/2026 14:30" (hora de Lima). */
export function formatDateTimeLima(value: string): string {
  if (!value) return ''
  if (!DATE_TIME_RE.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const p = getLimaParts(date)
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

/**
 * "Hoy" según el calendario de Lima, como "YYYY-MM-DD" (útil para valores por defecto de formularios).
 * `now` es inyectable para poder probarlo.
 */
export function todayInLima(now: Date = new Date()): string {
  const p = getLimaParts(now)
  return `${p.year}-${p.month}-${p.day}`
}