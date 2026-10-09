import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { KardexRow } from "./schema"

// Solo lectura: el Kardex lo escribe el sistema con cada movimiento, nunca una persona
export const kardexService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<KardexRow>>("/inventory/kardex", { query: toListQuery(params), signal }),
}