import type { PageParams, Paginated } from '@/shared/lib/api/types'
import { api } from '@/shared/lib/api/client'
import { toListQuery } from '@/shared/lib/api/query'

/** list, get, create, update y delete de un documento en borrador, más sus acciones de estado */
function documentService<T, I>(base: string) {
  return {
    list: (params: PageParams, signal?: AbortSignal) =>
      api.get<Paginated<T>>(base, { query: toListQuery(params), signal }),
    get: (id: string, signal?: AbortSignal) =>
      api.get<T>(`${base}/${encodeURIComponent(id)}`, { signal }),
    create: (input: I) => api.post<T>(base, input),
    update: (id: string, input: I) => api.put<T>(`${base}/${encodeURIComponent(id)}`, input),
    remove: (id: string) => api.delete(`${base}/${encodeURIComponent(id)}`),
    action: (id: string, action: string, body: object = {}) =>
      api.post<T>(`${base}/${encodeURIComponent(id)}/${action}`, body),
  }
}

export type DocumentService<T, I> = ReturnType<typeof documentService<T, I>>

export { documentService }

