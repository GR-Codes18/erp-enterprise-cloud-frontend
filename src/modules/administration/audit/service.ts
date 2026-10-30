import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { AuditEvent } from "./schema"

// Solo lectura: la auditoría no se crea, edita ni borra desde el frontend
export const auditService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<AuditEvent>>("/audit", { query: toListQuery(params), signal }),
}