import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Customer, CustomerInput } from "./schema"

const BASE = "/customers"

export const customerService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Customer>>(BASE, {
      query: { page: params.page, size: params.size, search: params.search },
      signal,
    }),

  create: (input: CustomerInput) => api.post<Customer>(BASE, input),

  update: (id: string, input: CustomerInput) =>
    api.put<Customer>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}