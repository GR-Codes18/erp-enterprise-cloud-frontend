import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { customerService } from "./service"
import type { Customer, CustomerCreateInput, CustomerUpdateInput } from "./schema"

export const customerKeys = {
  all: ["customers"] as const,
  list: (params: PageParams) => [...customerKeys.all, "list", params] as const,
  options: (includeInactive: boolean) => [...customerKeys.all, "options", { includeInactive }] as const,
}

export function useCustomers(params: PageParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: ({ signal }) => customerService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export interface CustomerOption {
  id: string
  name: string
  document_type: Customer["document_type"]
  document_number: string
  credit_limit: string
  status: Customer["status"]
}

/**
 * Clientes para selectores de otros módulos (regla 0.5). Por defecto solo activos (documentos
 * nuevos); includeInactive para vistas de consulta o documentos antiguos.
 */
export function useCustomerOptions({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const params: PageParams = { page: 1, size: 100, filters: includeInactive ? {} : { status: "active" } }
  return useQuery({
    queryKey: customerKeys.options(includeInactive),
    queryFn: ({ signal }) => customerService.list(params, signal),
    select: (data): CustomerOption[] =>
      data.items.map((c) => ({
        id: c.id,
        name: c.status === "active" ? c.name : `${c.name} (inactivo)`,
        document_type: c.document_type,
        document_number: c.document_number,
        credit_limit: c.credit_limit,
        status: c.status,
      })),
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
    mutationFn: (input: CustomerCreateInput) => customerService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomers()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerUpdateInput }) =>
      customerService.update(id, input),
    onSuccess: invalidate,
  })
}

export function usePatchCustomer() {
  const invalidate = useInvalidateCustomers()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Customer> }) =>
      customerService.patch(id, input),
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