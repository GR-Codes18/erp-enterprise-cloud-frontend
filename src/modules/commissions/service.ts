import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Commission, CommissionInput } from "./schema"

const BASE = "/commissions"

export const commissionService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Commission>>(BASE, { query: toListQuery(params), signal }),
  create: (input: CommissionInput) => api.post<Commission>(BASE, input),
  update: (id: string, input: CommissionInput) =>
    api.put<Commission>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}
