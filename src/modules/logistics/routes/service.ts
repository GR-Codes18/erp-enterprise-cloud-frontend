import { api } from '@/shared/lib/api/client'
import type { PageParams, Paginated } from '@/shared/lib/api/types'
import type { Route, RouteInput } from './schema'
import { toListQuery } from '@/shared/lib/api/query'

const BASE = '/logistics/routes'

export const routeService = {
  list: (params: PageParams, signal?: AbortSignal) => api.get<Paginated<Route>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<Route>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: RouteInput) => api.post<Route>(BASE, input),
  update: (id: string, input: RouteInput) => api.put<Route>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
  action: (id: string, action: string, body: object = {}) => api.post<Route>(`${BASE}/${encodeURIComponent(id)}/${action}`, body),
}

