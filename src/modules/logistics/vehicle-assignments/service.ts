import { api } from '@/shared/lib/api/client'
import type { PageParams, Paginated } from '@/shared/lib/api/types'
import type { VehicleAssignment, VehicleAssignmentInput } from './schema'
import { toListQuery } from '@/shared/lib/api/query'

const BASE = '/logistics/vehicle-assignments'

export const vehicleAssignmentService = {
  list: (params: PageParams, signal?: AbortSignal) => api.get<Paginated<VehicleAssignment>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<VehicleAssignment>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: VehicleAssignmentInput) => api.post<VehicleAssignment>(BASE, input),
  update: (id: string, input: VehicleAssignmentInput) => api.put<VehicleAssignment>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
  action: (id: string, action: string, body: object = {}) => api.post<VehicleAssignment>(`${BASE}/${encodeURIComponent(id)}/${action}`, body),
}

