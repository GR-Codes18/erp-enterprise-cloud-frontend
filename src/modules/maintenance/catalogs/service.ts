import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { MasterCatalogInput, MasterCatalogRecord, MasterCatalogResource } from "./schema"

const resourcePath = (resource: MasterCatalogResource) => `/maintenance/catalogs/${resource}`

export const masterCatalogService = {
  list: (resource: MasterCatalogResource, params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<MasterCatalogRecord>>(resourcePath(resource), { query: toListQuery(params), signal }),
  create: (resource: MasterCatalogResource, input: MasterCatalogInput) =>
    api.post<MasterCatalogRecord>(resourcePath(resource), input),
  update: (resource: MasterCatalogResource, id: string, input: MasterCatalogInput) =>
    api.put<MasterCatalogRecord>(`${resourcePath(resource)}/${encodeURIComponent(id)}`, input),
  patch: (resource: MasterCatalogResource, id: string, input: Partial<MasterCatalogInput>) =>
    api.patch<MasterCatalogRecord>(`${resourcePath(resource)}/${encodeURIComponent(id)}`, input),
  remove: (resource: MasterCatalogResource, id: string) =>
    api.delete<void>(`${resourcePath(resource)}/${encodeURIComponent(id)}`),
}
