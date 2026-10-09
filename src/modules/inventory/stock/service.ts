import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { StockRow } from "./schema"

// Solo lectura: no hay crear, editar ni borrar. El stock cambia únicamente por movimientos.
export const stockService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<StockRow>>("/inventory/stock", { query: toListQuery(params), signal }),
}