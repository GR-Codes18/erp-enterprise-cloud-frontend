import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Customer, CustomerCreateInput, CustomerUpdateInput } from "./schema"
import { toListQuery } from "@/shared/lib/api/query"

const BASE = "/customers"

export const customerService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Customer>>(BASE, { query: toListQuery(params), signal }),

  getById: (id: string, signal?: AbortSignal) =>
    api.get<Customer>(`${BASE}/${encodeURIComponent(id)}`, { signal }),

  create: (input: CustomerCreateInput) => api.post<Customer>(BASE, input),

  update: (id: string, input: CustomerUpdateInput) =>
    api.put<Customer>(`${BASE}/${encodeURIComponent(id)}`, input),

  patch: (id: string, input: Partial<Customer>) =>
    api.patch<Customer>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}