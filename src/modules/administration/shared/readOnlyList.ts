import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"

/**
 * Listado de consulta (con paginación, búsqueda y filtros) de un recurso de Administración.
 * Devuelve el hook listo para usar en la pantalla: useX(params).
 */
export function createReadOnlyListHook<T>(resource: string) {
  return (params: PageParams) =>
    useQuery({
      queryKey: ["administration", resource, "list", params],
      queryFn: ({ signal }) =>
        api.get<Paginated<T>>(`/${resource}`, { query: toListQuery(params), signal }),
      // Mientras carga otra página se sigue viendo la anterior (sin parpadeo)
      placeholderData: keepPreviousData,
      // Otros módulos pueden haber registrado cambios mientras la pantalla no estaba abierta
      refetchOnMount: "always",
    })
}
