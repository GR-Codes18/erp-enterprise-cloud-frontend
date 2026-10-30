import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { logisticsOperationsService } from "./operationsService"
import type { LogisticsOperation, LogisticsOperationInput } from "./operations"

const keys = {
  all: ["logistics-operations"] as const,
  list: (resource: LogisticsOperation, params: PageParams) =>
    [...keys.all, resource, params] as const,
}

export function useLogisticsOperations(resource: LogisticsOperation, params: PageParams) {
  return useQuery({
    queryKey: keys.list(resource, params),
    queryFn: ({ signal }) => logisticsOperationsService.list(resource, params, signal),
    placeholderData: keepPreviousData,
  })
}

function useInvalidateLogisticsOperations() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.all })
}

export function useCreateLogisticsOperation() {
  const invalidate = useInvalidateLogisticsOperations()
  return useMutation({
    mutationFn: ({ resource, input }: { resource: LogisticsOperation; input: LogisticsOperationInput }) =>
      logisticsOperationsService.create(resource, input),
    onSuccess: invalidate,
  })
}

export function useUpdateLogisticsOperation() {
  const invalidate = useInvalidateLogisticsOperations()
  return useMutation({
    mutationFn: ({ resource, id, input }: { resource: LogisticsOperation; id: string; input: LogisticsOperationInput }) =>
      logisticsOperationsService.update(resource, id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteLogisticsOperation() {
  const invalidate = useInvalidateLogisticsOperations()
  return useMutation({
    mutationFn: ({ resource, id }: { resource: LogisticsOperation; id: string }) =>
      logisticsOperationsService.remove(resource, id),
    onSuccess: invalidate,
  })
}
