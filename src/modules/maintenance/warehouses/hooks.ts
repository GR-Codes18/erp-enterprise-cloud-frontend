import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { warehouseService } from "./service"
import type { Warehouse, WarehouseCreateInput, WarehouseUpdateInput } from "./schema"

export const warehouseKeys = {
  all: ["warehouses"] as const,
  list: (params: PageParams) => [...warehouseKeys.all, "list", params] as const,
  options: (includeInactive: boolean) => [...warehouseKeys.all, "options", { includeInactive }] as const,
}

export function useWarehouses(params: PageParams) {
  return useQuery({
    queryKey: warehouseKeys.list(params),
    queryFn: ({ signal }) => warehouseService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export interface WarehouseOption {
  id: string
  code: string
  /** Si el almacén está inactivo, el nombre lo indica: "(inactivo)" */
  name: string
  status: Warehouse["status"]
}

/**
 * Opciones de almacenes para selectores de otros módulos (regla 0.5).
 * Por defecto solo activos; includeInactive es para filtros de vistas de solo lectura.
 */
export function useWarehouseOptions({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const params: PageParams = {
    page: 1,
    size: 100,
    filters: includeInactive ? {} : { status: "active" },
  }
  return useQuery({
    queryKey: warehouseKeys.options(includeInactive),
    queryFn: ({ signal }) => warehouseService.list(params, signal),
    select: (data): WarehouseOption[] =>
      data.items.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.status === "active" ? w.name : `${w.name} (inactivo)`,
        status: w.status,
      })),
  })
}

function useInvalidateWarehouses() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: warehouseKeys.all })
}

export function useCreateWarehouse() {
  const invalidate = useInvalidateWarehouses()
  return useMutation({
    mutationFn: (input: WarehouseCreateInput) => warehouseService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateWarehouse() {
  const invalidate = useInvalidateWarehouses()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WarehouseUpdateInput }) =>
      warehouseService.update(id, input),
    onSuccess: invalidate,
  })
}

export function usePatchWarehouse() {
  const invalidate = useInvalidateWarehouses()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Warehouse> }) =>
      warehouseService.patch(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteWarehouse() {
  const invalidate = useInvalidateWarehouses()
  return useMutation({
    mutationFn: (id: string) => warehouseService.remove(id),
    onSuccess: invalidate,
  })
}