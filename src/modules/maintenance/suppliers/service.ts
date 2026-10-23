import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Supplier, SupplierCreateInput, SupplierUpdateInput } from "./schema"
import { toListQuery } from "@/shared/lib/api/query"

const BASE = "/suppliers"

export const supplierService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Supplier>>(BASE, { query: toListQuery(params), signal }),

  getById: (id: string, signal?: AbortSignal) =>
    api.get<Supplier>(`${BASE}/${encodeURIComponent(id)}`, { signal }),

  create: (input: SupplierCreateInput) => api.post<Supplier>(BASE, input),

  update: (id: string, input: SupplierUpdateInput) =>
    api.put<Supplier>(`${BASE}/${encodeURIComponent(id)}`, input),

  patch: (id: string, input: Partial<Supplier>) =>
    api.patch<Supplier>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}