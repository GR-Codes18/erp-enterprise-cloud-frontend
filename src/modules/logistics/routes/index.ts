import { useQuery } from '@tanstack/react-query'
import type { PageParams } from '@/shared/lib/api/types'
import { routeService } from './service'
import type { Route } from './schema'

export const routeOptionsKeys = {
  all: ['logistics', 'routes', 'options'] as const,
  list: (search: string) => [...routeOptionsKeys.all, search] as const,
}

export type RouteOption = {
  id: string
  number: string
  name: string
}

export function useRouteOptions({ search = '' }: { search?: string } = {}) {
  const params: PageParams = {
    page: 1,
    size: 100,
    search,
  }

  return useQuery({
    queryKey: routeOptionsKeys.list(search),
    queryFn: ({ signal }) => routeService.list(params, signal),
    select: (data): RouteOption[] =>
      (data.items ?? []).map((route: Route) => ({
        id: route.id,
        number: route.number,
        name: route.name,
      })),
  })
}
