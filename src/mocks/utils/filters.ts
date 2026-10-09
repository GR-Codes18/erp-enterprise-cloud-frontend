import { limaDayOf } from "@/shared/lib/dates"

export interface ListFilterOptions<T> {
  /** Campos de texto donde busca ?search= */
  searchFields: (keyof T)[]
  /** Campos que aceptan filtro exacto (?campo=valor). Los demás parámetros se ignoran */
  filterFields?: (keyof T)[]
  /** Campo con fecha ISO sobre el que actúan date_from y date_to */
  dateField?: keyof T
}

export type FilterResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; status: number; code: string; message: string }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Aplica búsqueda, filtros exactos y rango de fechas, en ese orden. */
export function applyListFilters<T>(
  items: T[],
  params: URLSearchParams,
  { searchFields, filterFields = [], dateField }: ListFilterOptions<T>,
): FilterResult<T> {
  const from = params.get("date_from") ?? ""
  const to = params.get("date_to") ?? ""

  // Se valida antes de filtrar: un rango inválido no debe devolver datos a medias
  for (const value of [from, to]) {
    if (value && !DATE_PATTERN.test(value)) {
      return {
        ok: false,
        status: 400,
        code: "BAD_REQUEST",
        message: "Fecha no válida, usa el formato AAAA-MM-DD",
      }
    }
  }
  if (from && to && from > to) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "La fecha inicial no puede ser mayor que la final",
    }
  }

  let result = items

  const search = (params.get("search") ?? "").trim().toLowerCase()
  if (search) {
    result = result.filter((item) =>
      searchFields.some((field) => String(item[field] ?? "").toLowerCase().includes(search)),
    )
  }

  for (const field of filterFields) {
    const value = params.get(String(field))
    if (value) result = result.filter((item) => String(item[field]) === value)
  }

  if (dateField && (from || to)) {
    result = result.filter((item) => {
      // El día se toma en hora de Lima (contrato) y se compara como texto AAAA-MM-DD
      const day = limaDayOf(String(item[dateField]))
      return (!from || day >= from) && (!to || day <= to)
    })
  }

  return { ok: true, items: result }
}