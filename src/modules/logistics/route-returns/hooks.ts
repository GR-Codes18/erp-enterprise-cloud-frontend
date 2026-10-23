import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageParams } from '@/shared/lib/api/types'
import { documentService, type DocumentService } from '@/modules/logistics/service'
import type { RouteReturn, RouteReturnInput } from './schema'

export const routeReturnKeys = {
  all: ['logistics', 'route-returns'] as const,
  list: (params: PageParams) => [...routeReturnKeys.all, 'list', params] as const,
  detail: (id: string) => [...routeReturnKeys.all, 'detail', id] as const,
}

function documentHooks<T, I>(_resource: string, service: DocumentService<T, I>) {
  const useInvalidate = () => {
    const queryClient = useQueryClient()
    return () => Promise.all([
      queryClient.invalidateQueries({ queryKey: routeReturnKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['logistics', 'despatches'] }),
      queryClient.invalidateQueries({ queryKey: ['logistics', 'tracking'] }),
      queryClient.invalidateQueries({ queryKey: ['logistics', 'route-costs'] }),
    ])
  }

  return {
    useList: (params: PageParams) => useQuery({
      queryKey: routeReturnKeys.list(params),
      queryFn: ({ signal }) => service.list(params, signal),
      placeholderData: keepPreviousData,
    }),
    useDetail: (id: string) => useQuery({
      queryKey: routeReturnKeys.detail(id),
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

export const routeReturnHooks = documentHooks<RouteReturn, RouteReturnInput>('route-returns', documentService<RouteReturn, RouteReturnInput>('/logistics/route-returns'))


