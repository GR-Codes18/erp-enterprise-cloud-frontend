import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageParams } from '@/shared/lib/api/types'
import { documentService, type DocumentService } from '@/modules/logistics/service'
import type { RouteCost, RouteCostInput } from './schema'

export const routeCostKeys = {
  all: ['logistics', 'route-costs'] as const,
  list: (params: PageParams) => [...routeCostKeys.all, 'list', params] as const,
  detail: (id: string) => [...routeCostKeys.all, 'detail', id] as const,
}

function documentHooks<T, I>(_resource: string, service: DocumentService<T, I>) {
  const useInvalidate = () => {
    const queryClient = useQueryClient()
    return () => Promise.all([
      queryClient.invalidateQueries({ queryKey: routeCostKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['logistics', 'routes'] }),
      queryClient.invalidateQueries({ queryKey: ['logistics', 'route-returns'] }),
    ])
  }

  return {
    useList: (params: PageParams) => useQuery({
      queryKey: routeCostKeys.list(params),
      queryFn: ({ signal }) => service.list(params, signal),
      placeholderData: keepPreviousData,
    }),
    useDetail: (id: string) => useQuery({
      queryKey: routeCostKeys.detail(id),
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

export const routeCostHooks = documentHooks<RouteCost, RouteCostInput>('route-costs', documentService<RouteCost, RouteCostInput>('/logistics/route-costs'))



