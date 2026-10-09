import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { adjustmentService } from "./service"
import type { AdjustmentInput } from "./schema"

export const adjustmentKeys = {
  all: ["inventory", "adjustments"] as const,
  list: (params: PageParams) => [...adjustmentKeys.all, "list", params] as const,
  detail: (id: string) => [...adjustmentKeys.all, "detail", id] as const,
}

export function useAdjustments(params: PageParams) {
  return useQuery({
    queryKey: adjustmentKeys.list(params),
    queryFn: ({ signal }) => adjustmentService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useAdjustment(id: string) {
  return useQuery({
    queryKey: adjustmentKeys.detail(id),
    queryFn: ({ signal }) => adjustmentService.get(id, signal),
    enabled: id !== "",
  })
}

function useInvalidateAdjustments() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adjustmentKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["stock"] }),
      queryClient.invalidateQueries({ queryKey: ["kardex"] }),
    ])
}

export function useCreateAdjustment() {
  const invalidate = useInvalidateAdjustments()
  return useMutation({ mutationFn: (input: AdjustmentInput) => adjustmentService.create(input), onSuccess: invalidate })
}

export function useUpdateAdjustment() {
  const invalidate = useInvalidateAdjustments()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustmentInput }) => adjustmentService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useApplyAdjustment() {
  const invalidate = useInvalidateAdjustments()
  return useMutation({ mutationFn: (id: string) => adjustmentService.apply(id), onSuccess: invalidate })
}

export function useDeleteAdjustment() {
  const invalidate = useInvalidateAdjustments()
  return useMutation({ mutationFn: (id: string) => adjustmentService.remove(id), onSuccess: invalidate })
}
