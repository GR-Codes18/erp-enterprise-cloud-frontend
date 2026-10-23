import { api } from '@/shared/lib/api/client'
import type { PageParams, Paginated } from '@/shared/lib/api/types'
import type { DeliveryConfirmation, DeliveryConfirmationInput } from './schema'
import { toListQuery } from '@/shared/lib/api/query'

const BASE = '/logistics/delivery-confirmations'

export const deliveryConfirmationService = {
  list: (params: PageParams, signal?: AbortSignal) => api.get<Paginated<DeliveryConfirmation>>(BASE, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<DeliveryConfirmation>(`${BASE}/${encodeURIComponent(id)}`, { signal }),
  create: (input: DeliveryConfirmationInput) => api.post<DeliveryConfirmation>(BASE, input),
  update: (id: string, input: DeliveryConfirmationInput) => api.put<DeliveryConfirmation>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
  action: (id: string, action: string, body: object = {}) => api.post<DeliveryConfirmation>(`${BASE}/${encodeURIComponent(id)}/${action}`, body),
}

