import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Warehouse, WarehouseCreateInput, WarehouseUpdateInput } from "./schema"
import { toListQuery } from "@/shared/lib/api/query"

const BASE = "/warehouses"

export const warehouseService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Warehouse>>(BASE, { query: toListQuery(params), signal }),

  getById: (id: string, signal?: AbortSignal) =>
    api.get<Warehouse>(`${BASE}/${encodeURIComponent(id)}`, { signal }),

  create: (input: WarehouseCreateInput) => api.post<Warehouse>(BASE, input),

  update: (id: string, input: WarehouseUpdateInput) =>
    api.put<Warehouse>(`${BASE}/${encodeURIComponent(id)}`, input),

  patch: (id: string, input: Partial<Warehouse>) =>
    api.patch<Warehouse>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}