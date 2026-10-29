import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { commissionOperationsService } from "./operationsService"
import type { CommissionOperation, CommissionOperationInput } from "./operations"

const keys = {
  all: ["commission-operations"] as const,
  list: (resource: CommissionOperation, params: PageParams) =>
    [...keys.all, resource, params] as const,
}

export function useCommissionOperations(resource: CommissionOperation, params: PageParams) {
  return useQuery({
    queryKey: keys.list(resource, params),
    queryFn: ({ signal }) => commissionOperationsService.list(resource, params, signal),
    placeholderData: keepPreviousData,
  })
}

function useInvalidateCommissionOperations() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.all })
}

export function useCreateCommissionOperation() {
  const invalidate = useInvalidateCommissionOperations()
  return useMutation({
    mutationFn: ({ resource, input }: { resource: CommissionOperation; input: CommissionOperationInput }) =>
      commissionOperationsService.create(resource, input),
    onSuccess: invalidate,
  })
}

export function useUpdateCommissionOperation() {
  const invalidate = useInvalidateCommissionOperations()
  return useMutation({
    mutationFn: ({ resource, id, input }: { resource: CommissionOperation; id: string; input: CommissionOperationInput }) =>
      commissionOperationsService.update(resource, id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCommissionOperation() {
  const invalidate = useInvalidateCommissionOperations()
  return useMutation({
    mutationFn: ({ resource, id }: { resource: CommissionOperation; id: string }) =>
      commissionOperationsService.remove(resource, id),
    onSuccess: invalidate,
  })
}
