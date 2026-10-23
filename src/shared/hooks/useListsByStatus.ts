import { useQueries } from "@tanstack/react-query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"

/**
 * Un listado por estado, filtrado en el servidor, unido en una sola lista (para selectores que
 * necesitan "emitidos o con pago parcial", algo que el filtro exacto no expresa en una consulta).
 */
export function useListsByStatus<T>(
  keyRoot: readonly unknown[],
  statuses: readonly string[],
  list: (params: PageParams, signal: AbortSignal) => Promise<Paginated<T>>,
  extraFilters: Record<string, string> = {},
  enabled = true,
) {
  return useQueries({
    queries: statuses.map((status) => {
      const params: PageParams = { page: 1, size: 100, filters: { ...extraFilters, status } }
      return {
        queryKey: [...keyRoot, "list", params],
        queryFn: ({ signal }: { signal: AbortSignal }) => list(params, signal),
        enabled,
      }
    }),
    combine: (results) => ({
      data: results.every((result) => result.isSuccess) ? results.flatMap((result) => result.data?.items ?? []) : undefined,
      isPending: enabled && results.some((result) => result.isPending),
      isError: results.some((result) => result.isError),
      error: results.find((result) => result.isError)?.error ?? null,
      refetch: () => results.forEach((result) => void result.refetch()),
    }),
  })
}
