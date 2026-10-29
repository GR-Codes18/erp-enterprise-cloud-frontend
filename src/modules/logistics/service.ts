import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Shipment, ShipmentInput } from "./schema"

const BASE = "/logistics/shipments"

export const logisticsService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Shipment>>(BASE, { query: toListQuery(params), signal }),
  create: (input: ShipmentInput) => api.post<Shipment>(BASE, input),
  update: (id: string, input: ShipmentInput) =>
    api.put<Shipment>(`${BASE}/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`${BASE}/${encodeURIComponent(id)}`),
}
