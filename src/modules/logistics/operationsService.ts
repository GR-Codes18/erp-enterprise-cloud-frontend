import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type {
  LogisticsOperation,
  LogisticsOperationInput,
  LogisticsOperationRecord,
} from "./operations"

const resourcePath = (resource: LogisticsOperation) => `/logistics/operations/${resource}`

export const logisticsOperationsService = {
  list: (resource: LogisticsOperation, params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<LogisticsOperationRecord>>(resourcePath(resource), {
      query: toListQuery(params),
      signal,
    }),
  create: (resource: LogisticsOperation, input: LogisticsOperationInput) =>
    api.post<LogisticsOperationRecord>(resourcePath(resource), input),
  update: (resource: LogisticsOperation, id: string, input: LogisticsOperationInput) =>
    api.put<LogisticsOperationRecord>(`${resourcePath(resource)}/${encodeURIComponent(id)}`, input),
  remove: (resource: LogisticsOperation, id: string) =>
    api.delete<void>(`${resourcePath(resource)}/${encodeURIComponent(id)}`),
}
