import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { logisticsService } from "./service"
import type { ShipmentInput } from "./schema"

const keys = {
  all: ["logistics-shipments"] as const,
  list: (params: PageParams) => [...keys.all, "list", params] as const,
}

export function useShipments(params: PageParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: ({ signal }) => logisticsService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

function useInvalidateShipments() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.all })
}

export function useCreateShipment() {
  const invalidate = useInvalidateShipments()
  return useMutation({
    mutationFn: (input: ShipmentInput) => logisticsService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateShipment() {
  const invalidate = useInvalidateShipments()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ShipmentInput }) =>
      logisticsService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteShipment() {
  const invalidate = useInvalidateShipments()
  return useMutation({
    mutationFn: (id: string) => logisticsService.remove(id),
    onSuccess: invalidate,
  })
}
