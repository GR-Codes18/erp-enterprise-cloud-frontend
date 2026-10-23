import { api } from '@/shared/lib/api/client'
import type { PageParams, Paginated } from '@/shared/lib/api/types'
import type { DriverAssignment, DriverAssignmentInput } from './schema'
import { toListQuery } from '@/shared/lib/api/query'

const BASE = '/logistics/driver-assignments'

export const driverAssignmentService = {
  list: (params: PageParams, signal?: AbortSignal) => api.get<Paginated<DriverAssignment>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<DriverAssignment>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: DriverAssignmentInput) => api.post<DriverAssignment>(BASE, input),
  update: (id: string, input: DriverAssignmentInput) => api.put<DriverAssignment>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
  action: (id: string, action: string, body: object = {}) => api.post<DriverAssignment>(`${BASE}/${encodeURIComponent(id)}/${action}`, body),
}

