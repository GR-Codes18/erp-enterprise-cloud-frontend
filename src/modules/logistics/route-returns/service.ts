import { api } from '@/shared/lib/api/client'
import type { PageParams, Paginated } from '@/shared/lib/api/types'
import type { RouteReturn, RouteReturnInput } from './schema'
import { toListQuery } from '@/shared/lib/api/query'

const BASE = '/logistics/route-returns'

export const routeReturnService = {
  list: (params: PageParams, signal?: AbortSignal) => api.get<Paginated<RouteReturn>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<RouteReturn>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: RouteReturnInput) => api.post<RouteReturn>(BASE, input),
  update: (id: string, input: RouteReturnInput) => api.put<RouteReturn>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
  action: (id: string, action: string, body: object = {}) => api.post<RouteReturn>(`${BASE}/${encodeURIComponent(id)}/${action}`, body),
}

