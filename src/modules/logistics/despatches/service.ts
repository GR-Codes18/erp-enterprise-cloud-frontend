import { api } from '@/shared/lib/api/client'
import type { PageParams, Paginated } from '@/shared/lib/api/types'
import type { Despatch, DespatchInput } from './schema'
import { toListQuery } from '@/shared/lib/api/query'

const BASE = '/logistics/despatches'

export const despatchService = {
  list: (params: PageParams, signal?: AbortSignal) => api.get<Paginated<Despatch>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<Despatch>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: DespatchInput) => api.post<Despatch>(BASE, input),
  update: (id: string, input: DespatchInput) => api.put<Despatch>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
  action: (id: string, action: string, body: object = {}) => api.post<Despatch>(`${BASE}/${encodeURIComponent(id)}/${action}`, body),
}

