import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { supplierService } from "./service"
import type { SupplierInput } from "./schema"

export const supplierKeys = {
  all: ["suppliers"] as const,
  list: (params: PageParams) => [...supplierKeys.all, "list", params] as const,
  options: () => [...supplierKeys.all, "options"] as const,
}

export function useSuppliers(params: PageParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: ({ signal }) => supplierService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Hook de consulta rápida de opciones para selectores en otros módulos (Regla 0.5). */
export function useSupplierOptions() {
  const params: PageParams = { page: 1, size: 100, filters: { status: "active" } }
  return useQuery({
    queryKey: supplierKeys.options(),
    queryFn: ({ signal }) => supplierService.list(params, signal),
    select: (data) =>
      data.items.map((s) => ({
        id: s.id,
        name: s.name,
        document_number: s.document_number,
        credit_days: s.credit_days,
      })),
  })
}

/** Tras crear, editar o borrar se invalidan todas las consultas de proveedores. */
function useInvalidateSuppliers() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: supplierKeys.all })
}

export function useCreateSupplier() {
  const invalidate = useInvalidateSuppliers()
  return useMutation({
    mutationFn: (input: SupplierInput) => supplierService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateSupplier() {
  const invalidate = useInvalidateSuppliers()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierInput }) =>
      supplierService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteSupplier() {
  const invalidate = useInvalidateSuppliers()
  return useMutation({
    mutationFn: (id: string) => supplierService.remove(id),
    onSuccess: invalidate,
  })
}