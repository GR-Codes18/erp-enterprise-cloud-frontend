import type { PageParams } from "@/shared/lib/api/types"

/** Valor centinela de los filtros "todos": Radix Select no admite cadenas vacías como valor */
export const FILTER_ALL = "all"

/** Solo viajan al backend los filtros que la persona realmente eligió */
export function pickFilters(values: Record<string, string>): Record<string, string> {
  const filters: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== FILTER_ALL && value !== "") filters[key] = value
  }
  return filters
}

/** Fechas AAAA-MM-DD. Un extremo vacío no restringe. El backend responde 422 si desde > hasta. */
export function isValidDateRange(from: string, to: string): boolean {
  if (from === "" || to === "") return true
  return from <= to
}

/** Un rango invertido no se envía (se avisa junto al campo); los extremos vacíos tampoco */
export function dateRangeParams(from: string, to: string): Pick<PageParams, "date_from" | "date_to"> {
  if (!isValidDateRange(from, to)) return {}
  return {
    ...(from ? { date_from: from } : {}),
    ...(to ? { date_to: to } : {}),
  }
}
