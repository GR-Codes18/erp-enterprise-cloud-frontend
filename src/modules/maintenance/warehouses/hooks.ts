import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { warehouseService } from "./service"
import type { WarehouseInput } from "./schema"

export const warehouseKeys = {
  all: ["warehouses"] as const,
  list: (params: PageParams) => [...warehouseKeys.all, "list", params] as const,
  options: () => [...warehouseKeys.all, "options"] as const,
}

export function useWarehouses(params: PageParams) {
  return useQuery({
    queryKey: warehouseKeys.list(params),
    queryFn: ({ signal }) => warehouseService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Hook de opciones rápidas para selectores en otros módulos (Regla 0.5). */
export function useWarehouseOptions() {
  const params: PageParams = { page: 1, size: 100, filters: { status: "active" } }
  return useQuery({
    queryKey: warehouseKeys.options(),
    queryFn: ({ signal }) => warehouseService.list(params, signal),
    select: (data) =>
      data.items.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
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
    mutationFn: (input: WarehouseInput) => warehouseService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateWarehouse() {
  const invalidate = useInvalidateWarehouses()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WarehouseInput }) =>
      warehouseService.update(id, input),
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