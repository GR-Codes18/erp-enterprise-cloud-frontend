import { useQuery } from '@tanstack/react-query'
import type { PageParams } from '@/shared/lib/api/types'
import { driverAssignmentService } from './service'
import type { DriverAssignment } from './schema'

export const driverAssignmentOptionsKeys = {
  all: ['logistics', 'driver-assignments', 'options'] as const,
  list: (search: string) => [...driverAssignmentOptionsKeys.all, search] as const,
}

export type DriverAssignmentOption = {
  id: string
  number: string
  driver_name: string
}

export function useDriverOptions({ search = '' }: { search?: string } = {}) {
  const params: PageParams = {
    page: 1,
    size: 100,
    search,
  }

  return useQuery({
    queryKey: driverAssignmentOptionsKeys.list(search),
    queryFn: ({ signal }) => driverAssignmentService.list(params, signal),
    select: (data): DriverAssignmentOption[] =>
      (data.items ?? []).map((driverAssignment: DriverAssignment) => ({
        id: driverAssignment.id,
        number: driverAssignment.number,
        driver_name: driverAssignment.driver_name,
      })),
  })
}
