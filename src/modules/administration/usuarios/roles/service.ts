import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { Role, RoleInput } from "./schema"

const BASE = "/roles"

export const roleService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Role>>(BASE, { query: toListQuery(params), signal }),

  create: (input: RoleInput) => api.post<Role>(BASE, input),

  update: (id: string, input: RoleInput) =>
    api.put<Role>(`${BASE}/${encodeURIComponent(id)}`, input),

  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}