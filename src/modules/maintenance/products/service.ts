import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { Product, ProductInput } from "./schema"

const BASE = "/products"

export const productService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Product>>(BASE, { query: toListQuery(params), signal }),

  create: (input: ProductInput) => api.post<Product>(BASE, input),

  update: (id: string, input: ProductInput) =>
    api.put<Product>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}