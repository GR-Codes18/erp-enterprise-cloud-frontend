import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Category, CategoryInput } from "./schema"
import { toListQuery } from "@/shared/lib/api/query"

const BASE = "/categories"

export const categoryService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Category>>(BASE, { query: toListQuery(params), signal }),

  getById: (id: string, signal?: AbortSignal) =>
    api.get<Category>(`${BASE}/${encodeURIComponent(id)}`, { signal }),

  create: (input: CategoryInput) => api.post<Category>(BASE, input),

  update: (id: string, input: CategoryInput) =>
    api.put<Category>(`${BASE}/${encodeURIComponent(id)}`, input),

  patch: (id: string, input: Partial<Category>) =>
    api.patch<Category>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}