import { useState } from "react"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import type { PageParams } from "@/shared/lib/api/types"
import { FILTER_ALL, dateRangeParams, pickFilters } from "@/shared/lib/filters"

/**
 * Estado de un listado con búsqueda, filtros exactos y rango de fechas. Cada cambio de filtro
 * vuelve a la página 1, y `params` está listo para la queryKey y el servicio (receta 4.3).
 */
export function useListFilters<K extends string>(filterKeys: readonly K[], { pageSize = 10, initial = {} as Partial<Record<K, string>> } = {}) {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInputState] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const emptyValues = () =>
    Object.fromEntries(filterKeys.map((key) => [key, initial[key] ?? FILTER_ALL])) as Record<K, string>
  const [values, setValues] = useState<Record<K, string>>(emptyValues)
  const [dateFrom, setDateFromState] = useState("")
  const [dateTo, setDateToState] = useState("")

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  const filters = pickFilters(values)
  const params: PageParams = { page, size: pageSize, search, filters, ...dateRangeParams(dateFrom, dateTo) }
  const hasFilters = search !== "" || Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  return {
    page,
    setPage,
    params,
    hasFilters,
    searchInput,
    setSearchInput: resetPage(setSearchInputState),
    values,
    setFilter: (key: K) => resetPage((value: string) => setValues((current) => ({ ...current, [key]: value }))),
    dateFrom,
    dateTo,
    setDateFrom: resetPage(setDateFromState),
    setDateTo: resetPage(setDateToState),
    clear: () => {
      setSearchInputState("")
      setValues(Object.fromEntries(filterKeys.map((key) => [key, FILTER_ALL])) as Record<K, string>)
      setDateFromState("")
      setDateToState("")
      setPage(1)
    },
  }
}
