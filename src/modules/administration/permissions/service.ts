import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { PermissionScreen } from "./schema"

// Catálogo de solo lectura: lo entrega el backend, el frontend no lo crea ni lo edita
export const permissionService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<PermissionScreen>>("/permissions", { query: toListQuery(params), signal }),
}