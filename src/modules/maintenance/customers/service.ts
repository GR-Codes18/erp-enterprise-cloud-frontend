import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Customer, CustomerInput } from "./schema"
import { toListQuery } from "@/shared/lib/api/query"

const BASE = "/customers"

export const customerService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Customer>>(BASE, { query: toListQuery(params), signal }),

  create: (input: CustomerInput) => api.post<Customer>(BASE, input),

  update: (id: string, input: CustomerInput) =>
    api.put<Customer>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}