import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { stockService } from "./service"

export const stockKeys = {
  all: ["stock"] as const,
  list: (params: PageParams) => [...stockKeys.all, "list", params] as const,
}

export function useStock(params: PageParams) {
  return useQuery({
    queryKey: stockKeys.list(params),
    queryFn: ({ signal }) => stockService.list(params, signal),
    // Mientras carga otra página se sigue viendo la anterior (sin parpadeo)
    placeholderData: keepPreviousData,
  })
}

/** Existencias exactas para validar cantidades antes de mover o ajustar stock. */
export function useStockAvailability(warehouseId: string, productIds: string[]) {
  const uniqueProducts = Array.from(new Set(productIds.filter(Boolean)))
  const queries = useQueries({
    queries: uniqueProducts.map((productId) => ({
      queryKey: [...stockKeys.all, "availability", warehouseId, productId] as const,
      queryFn: ({ signal }) =>
        stockService.list(
          { page: 1, size: 1, filters: { warehouse_id: warehouseId, product_id: productId } },
          signal,
        ),
      enabled: warehouseId !== "",
    })),
  })

  return {
    // Solo productos ya consultados: lo que aún carga queda fuera (undefined), no como 0
    quantities: Object.fromEntries(
      queries.flatMap((query, index) =>
        query.isSuccess ? [[uniqueProducts[index], query.data.items[0]?.quantity ?? 0]] : [],
      ),
    ) as Record<string, number>,
    isPending: warehouseId !== "" && queries.some((query) => query.isPending),
    /** Productos cuya consulta falló: la línea dice "no se pudo consultar" en vez de "cargando…" */
    failed: uniqueProducts.filter((_, index) => queries[index]?.isError),
    error: queries.find((query) => query.isError)?.error,
  }
}