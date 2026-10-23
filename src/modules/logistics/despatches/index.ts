import { useQuery } from '@tanstack/react-query'
import type { PageParams } from '@/shared/lib/api/types'
import { despatchService } from './service'
import type { Despatch } from './schema'

export const despatchOptionsKeys = {
  all: ['logistics', 'despatches', 'options'] as const,
  list: (search: string) => [...despatchOptionsKeys.all, search] as const,
}

export type DespatchOption = {
  id: string
  number: string
  customer_name: string
}

export function useDespatchOptions({ search = '' }: { search?: string } = {}) {
  const params: PageParams = {
    page: 1,
    size: 100,
    search,
  }

  return useQuery({
    queryKey: despatchOptionsKeys.list(search),
    queryFn: ({ signal }) => despatchService.list(params, signal),
    select: (data): DespatchOption[] =>
      (data.items ?? []).map((despatch: Despatch) => ({
        id: despatch.id,
        number: despatch.number,
        customer_name: despatch.customer_name,
      })),
  })
}
