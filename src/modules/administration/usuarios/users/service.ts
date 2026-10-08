import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { User, UserInput } from "./schema"

const BASE = "/users"

// Sin remove: un usuario no se borra, solo se activa o desactiva (PUT con status)
export const userService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<User>>(BASE, { query: toListQuery(params), signal }),

  create: (input: UserInput) => api.post<User>(BASE, input),

  update: (id: string, input: UserInput) =>
    api.put<User>(`${BASE}/${encodeURIComponent(id)}`, input),
}