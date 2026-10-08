import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { Product, ProductCreateInput, ProductUpdateInput } from "./schema"

const BASE = "/products"

export const productService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Product>>(BASE, { query: toListQuery(params), signal }),

  create: (input: ProductCreateInput) => api.post<Product>(BASE, input),

  update: (id: string, input: ProductUpdateInput) =>
    api.put<Product>(`${BASE}/${encodeURIComponent(id)}`, input),

  patch: (id: string, input: Partial<Product>) =>
    api.patch<Product>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}