import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { Adjustment, AdjustmentInput } from "./schema"

const BASE = "/inventory/adjustments"

export const adjustmentService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Adjustment>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) =>
    api.get<Adjustment>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: AdjustmentInput) => api.post<Adjustment>(BASE, input),
  update: (id: string, input: AdjustmentInput) =>
    api.put<Adjustment>(`${BASE}/${encodeURIComponent(id)}`, input),
  apply: (id: string) => api.post<Adjustment>(`${BASE}/${encodeURIComponent(id)}/apply`, {}),
  remove: (id: string) => api.delete<void>(`${BASE}/${encodeURIComponent(id)}`),
}
