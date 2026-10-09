import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { transferService } from "./service"
import type { TransferInput } from "./schema"

export const transferKeys = {
  all: ["inventory", "transfers"] as const,
  list: (params: PageParams) => [...transferKeys.all, "list", params] as const,
  detail: (id: string) => [...transferKeys.all, "detail", id] as const,
}

export function useTransfers(params: PageParams) {
  return useQuery({
    queryKey: transferKeys.list(params),
    queryFn: ({ signal }) => transferService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useTransfer(id: string) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: ({ signal }) => transferService.get(id, signal),
    enabled: id !== "",
  })
}

function useInvalidateTransfers() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: transferKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["stock"] }),
      queryClient.invalidateQueries({ queryKey: ["kardex"] }),
    ])
}

export function useCreateTransfer() {
  const invalidate = useInvalidateTransfers()
  return useMutation({ mutationFn: (input: TransferInput) => transferService.create(input), onSuccess: invalidate })
}

export function useUpdateTransfer() {
  const invalidate = useInvalidateTransfers()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransferInput }) => transferService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useSendTransfer() {
  const invalidate = useInvalidateTransfers()
  return useMutation({ mutationFn: (id: string) => transferService.send(id), onSuccess: invalidate })
}

export function useReceiveTransfer() {
  const invalidate = useInvalidateTransfers()
  return useMutation({ mutationFn: (id: string) => transferService.receive(id), onSuccess: invalidate })
}

export function useCancelTransfer() {
  const invalidate = useInvalidateTransfers()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => transferService.cancel(id, reason),
    onSuccess: invalidate,
  })
}

export function useDeleteTransfer() {
  const invalidate = useInvalidateTransfers()
  return useMutation({ mutationFn: (id: string) => transferService.remove(id), onSuccess: invalidate })
}
