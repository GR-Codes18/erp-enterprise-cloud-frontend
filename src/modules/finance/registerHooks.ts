import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { FinanceRegisterInput, FinanceRegisterKind } from "./registers"
import { financeRegisterService } from "./registerService"

export function useFinanceRegisters(kind: FinanceRegisterKind) {
  return useQuery({
    queryKey: ["finance", "registers", kind],
    queryFn: ({ signal }) => financeRegisterService.list(kind, signal),
  })
}

function useInvalidateFinanceRegisters() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ["finance", "registers"] })
}

export function useCreateFinanceRegister() {
  const invalidate = useInvalidateFinanceRegisters()
  return useMutation({
    mutationFn: ({ kind, input }: { kind: FinanceRegisterKind; input: FinanceRegisterInput }) =>
      financeRegisterService.create(kind, input),
    onSuccess: invalidate,
  })
}

export function useUpdateFinanceRegisterStatus() {
  const invalidate = useInvalidateFinanceRegisters()
  return useMutation({
    mutationFn: ({ kind, id, status }: { kind: FinanceRegisterKind; id: string; status: string }) =>
      financeRegisterService.updateStatus(kind, id, status),
    onSuccess: invalidate,
  })
}
