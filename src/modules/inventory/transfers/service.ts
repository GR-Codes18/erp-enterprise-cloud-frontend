import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { Transfer, TransferInput } from "./schema"

const BASE = "/inventory/transfers"

export const transferService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Transfer>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) =>
    api.get<Transfer>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: TransferInput) => api.post<Transfer>(BASE, input),
  update: (id: string, input: TransferInput) =>
    api.put<Transfer>(`${BASE}/${encodeURIComponent(id)}`, input),
  send: (id: string) => api.post<Transfer>(`${BASE}/${encodeURIComponent(id)}/send`, {}),
  receive: (id: string) => api.post<Transfer>(`${BASE}/${encodeURIComponent(id)}/receive`, {}),
  cancel: (id: string, reason: string) =>
    api.post<Transfer>(`${BASE}/${encodeURIComponent(id)}/cancel`, { reason }),
  remove: (id: string) => api.delete<void>(`${BASE}/${encodeURIComponent(id)}`),
}
