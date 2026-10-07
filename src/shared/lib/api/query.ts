import type { QueryParams } from "@/shared/lib/api/client"
import type { PageParams } from "@/shared/lib/api/types"

/**
 * Convierte los parámetros de un listado en query string plano.
 * Los filtros se aplanan; `page`, `size`, `search` y las fechas siempre ganan
 * si un filtro intenta usar el mismo nombre. Los valores vacíos los descarta
 * buildUrl, así que no hace falta limpiarlos aquí.
 */
export function toListQuery(params: PageParams): QueryParams {
  const { filters, ...rest } = params
  return { ...filters, ...rest }
}