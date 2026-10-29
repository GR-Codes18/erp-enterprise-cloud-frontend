import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { commissionService } from "./service"
import type { CommissionInput } from "./schema"

const keys = {
  all: ["seller-commissions"] as const,
  list: (params: PageParams) => [...keys.all, "list", params] as const,
}

export function useCommissions(params: PageParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: ({ signal }) => commissionService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

function useInvalidateCommissions() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.all })
}

export function useCreateCommission() {
  const invalidate = useInvalidateCommissions()
  return useMutation({
    mutationFn: (input: CommissionInput) => commissionService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateCommission() {
  const invalidate = useInvalidateCommissions()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CommissionInput }) =>
      commissionService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCommission() {
  const invalidate = useInvalidateCommissions()
  return useMutation({
    mutationFn: (id: string) => commissionService.remove(id),
    onSuccess: invalidate,
  })
}
