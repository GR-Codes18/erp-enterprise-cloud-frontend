import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type {
  CommissionOperation,
  CommissionOperationInput,
  CommissionOperationRecord,
} from "./operations"

const resourcePath = (resource: CommissionOperation) => `/commissions/operations/${resource}`

export const commissionOperationsService = {
  list: (resource: CommissionOperation, params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<CommissionOperationRecord>>(resourcePath(resource), {
      query: toListQuery(params),
      signal,
    }),
  create: (resource: CommissionOperation, input: CommissionOperationInput) =>
    api.post<CommissionOperationRecord>(resourcePath(resource), input),
  update: (resource: CommissionOperation, id: string, input: CommissionOperationInput) =>
    api.put<CommissionOperationRecord>(`${resourcePath(resource)}/${encodeURIComponent(id)}`, input),
  remove: (resource: CommissionOperation, id: string) =>
    api.delete<void>(`${resourcePath(resource)}/${encodeURIComponent(id)}`),
}
