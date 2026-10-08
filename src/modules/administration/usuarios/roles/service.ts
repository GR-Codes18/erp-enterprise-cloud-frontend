import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { Role } from "./schema"

const BASE = "/roles"

export const roleService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Role>>(BASE, { query: toListQuery(params), signal }),
}