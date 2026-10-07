import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { customerService } from "./service"
import type { CustomerInput } from "./schema"

export const customerKeys = {
  all: ["customers"] as const,
  list: (params: PageParams) => [...customerKeys.all, "list", params] as const,
}

export function useCustomers(params: PageParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: ({ signal }) => customerService.list(params, signal),
    // Mientras carga otra página se sigue viendo la anterior (sin parpadeo)
    placeholderData: keepPreviousData,
  })
}

/** Tras crear, editar o borrar se invalidan todos los listados de clientes. */
function useInvalidateCustomers() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: customerKeys.all })
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers()
  return useMutation({
    mutationFn: (input: CustomerInput) => customerService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomers()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) =>
      customerService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCustomer() {
  const invalidate = useInvalidateCustomers()
  return useMutation({
    mutationFn: (id: string) => customerService.remove(id),
    onSuccess: invalidate,
  })
}