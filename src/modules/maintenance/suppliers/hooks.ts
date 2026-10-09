import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { supplierService } from "./service"
import type { Supplier, SupplierCreateInput, SupplierUpdateInput } from "./schema"

export const supplierKeys = {
  all: ["suppliers"] as const,
  list: (params: PageParams) => [...supplierKeys.all, "list", params] as const,
  options: (includeInactive: boolean) => [...supplierKeys.all, "options", { includeInactive }] as const,
}

export function useSuppliers(params: PageParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: ({ signal }) => supplierService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export interface SupplierOption {
  id: string
  name: string
  document_number: string
  credit_days: number
  status: Supplier["status"]
}

/**
 * Proveedores para selectores de otros módulos (regla 0.5). Por defecto solo activos;
 * includeInactive para vistas de consulta o documentos antiguos.
 */
export function useSupplierOptions({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const params: PageParams = { page: 1, size: 100, filters: includeInactive ? {} : { status: "active" } }
  return useQuery({
    queryKey: supplierKeys.options(includeInactive),
    queryFn: ({ signal }) => supplierService.list(params, signal),
    select: (data): SupplierOption[] =>
      data.items.map((s) => ({
        id: s.id,
        name: s.status === "active" ? s.name : `${s.name} (inactivo)`,
        document_number: s.document_number,
        credit_days: s.credit_days,
        status: s.status,
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
    mutationFn: (input: SupplierCreateInput) => supplierService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateSupplier() {
  const invalidate = useInvalidateSuppliers()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierUpdateInput }) =>
      supplierService.update(id, input),
    onSuccess: invalidate,
  })
}

export function usePatchSupplier() {
  const invalidate = useInvalidateSuppliers()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Supplier> }) =>
      supplierService.patch(id, input),
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