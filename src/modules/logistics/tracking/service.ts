import { api } from '@/shared/lib/api/client'
import type { PageParams, Paginated } from '@/shared/lib/api/types'
import type { Tracking, TrackingInput } from './schema'
import { toListQuery } from '@/shared/lib/api/query'

const BASE = '/logistics/tracking'

export const trackingService = {
  list: (params: PageParams, signal?: AbortSignal) => api.get<Paginated<Tracking>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<Tracking>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: TrackingInput) => api.post<Tracking>(BASE, input),
  update: (id: string, input: TrackingInput) => api.put<Tracking>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
  action: (id: string, action: string, body: object = {}) => api.post<Tracking>(`${BASE}/${encodeURIComponent(id)}/${action}`, body),
}

