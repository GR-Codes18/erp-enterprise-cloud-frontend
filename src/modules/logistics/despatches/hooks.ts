import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageParams } from '@/shared/lib/api/types'
import { documentService, type DocumentService } from '@/modules/logistics/service'
import type { Despatch, DespatchInput } from './schema'

export const despatchKeys = {
  all: ['logistics', 'despatches'] as const,
  list: (params: PageParams) => [...despatchKeys.all, 'list', params] as const,
  detail: (id: string) => [...despatchKeys.all, 'detail', id] as const,
}

function documentHooks<T, I>(_resource: string, service: DocumentService<T, I>) {
  const useInvalidate = () => {
    const queryClient = useQueryClient()
    return () => Promise.all([
      queryClient.invalidateQueries({ queryKey: despatchKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] }),
      queryClient.invalidateQueries({ queryKey: ['kardex'] }),
    ])
  }

  return {
    useList: (params: PageParams) => useQuery({
      queryKey: despatchKeys.list(params),
      queryFn: ({ signal }) => service.list(params, signal),
      placeholderData: keepPreviousData,
    }),
    useDetail: (id: string) => useQuery({
      queryKey: despatchKeys.detail(id),
      queryFn: ({ signal }) => service.get(id, signal),
      enabled: id !== '',
    }),
    useCreate: () => {
      const invalidate = useInvalidate()
      return useMutation({ mutationFn: (input: I) => service.create(input), onSuccess: invalidate })
    },
    useUpdate: () => {
      const invalidate = useInvalidate()
      return useMutation({
        mutationFn: ({ id, input }: { id: string; input: I }) => service.update(id, input),
        onSuccess: invalidate,
      })
    },
    useRemove: () => {
      const invalidate = useInvalidate()
      return useMutation({ mutationFn: (id: string) => service.remove(id), onSuccess: invalidate })
    },
    useAction: (action: string) => {
      const invalidate = useInvalidate()
      return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => service.action(id, action, reason === undefined ? {} : { reason }),
        onSuccess: invalidate,
      })
    },
  }
}

export const despatchHooks = documentHooks<Despatch, DespatchInput>('despatches', documentService<Despatch, DespatchInput>('/logistics/despatches'))

