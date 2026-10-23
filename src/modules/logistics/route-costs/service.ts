import { api } from '@/shared/lib/api/client'
import type { PageParams, Paginated } from '@/shared/lib/api/types'
import type { RouteCost, RouteCostInput } from './schema'
import { toListQuery } from '@/shared/lib/api/query'

const BASE = '/logistics/route-costs'

export const routeCostService = {
  list: (params: PageParams, signal?: AbortSignal) => api.get<Paginated<RouteCost>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<RouteCost>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: RouteCostInput) => api.post<RouteCost>(BASE, input),
  update: (id: string, input: RouteCostInput) => api.put<RouteCost>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
  action: (id: string, action: string, body: object = {}) => api.post<RouteCost>(`${BASE}/${encodeURIComponent(id)}/${action}`, body),
}

