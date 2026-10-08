import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Warehouse, WarehouseInput } from "./schema"
import { toListQuery } from "@/shared/lib/api/query"

const BASE = "/warehouses"

export const warehouseService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Warehouse>>(BASE, { query: toListQuery(params), signal }),

  create: (input: WarehouseInput) => api.post<Warehouse>(BASE, input),

  update: (id: string, input: WarehouseInput) =>
    api.put<Warehouse>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}