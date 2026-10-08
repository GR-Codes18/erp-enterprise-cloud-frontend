import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Supplier, SupplierInput } from "./schema"
import { toListQuery } from "@/shared/lib/api/query"

const BASE = "/suppliers"

export const supplierService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Supplier>>(BASE, { query: toListQuery(params), signal }),

  create: (input: SupplierInput) => api.post<Supplier>(BASE, input),

  update: (id: string, input: SupplierInput) =>
    api.put<Supplier>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}