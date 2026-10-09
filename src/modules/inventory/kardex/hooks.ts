import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { kardexService } from "./service"

export const kardexKeys = {
  all: ["kardex"] as const,
  list: (params: PageParams) => [...kardexKeys.all, "list", params] as const,
}

/** `enabled` evita consultar hasta que haya producto y rango de fechas (la consulta sería enorme). */
export function useKardex(params: PageParams, enabled: boolean) {
  return useQuery({
    queryKey: kardexKeys.list(params),
    queryFn: ({ signal }) => kardexService.list(params, signal),
    enabled,
    // Mientras carga otra página se sigue viendo la anterior (sin parpadeo)
    placeholderData: keepPreviousData,
  })
}