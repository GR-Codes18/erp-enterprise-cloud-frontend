import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { productService } from "./service"
import type { ProductInput } from "./schema"

export const productKeys = {
  all: ["products"] as const,
  list: (params: PageParams) => [...productKeys.all, "list", params] as const,
  options: () => [...productKeys.all, "options"] as const,
}

export function useProducts(params: PageParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => productService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Hook para selectores en módulos de Ventas/Compras/Inventario (Regla 0.5). */
export function useProductOptions() {
  const params: PageParams = { page: 1, size: 100, filters: { status: "active" } }
  return useQuery({
    queryKey: productKeys.options(),
    queryFn: ({ signal }) => productService.list(params, signal),
    select: (data) =>
      data.items.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit_price: p.unit_price,
      })),
  })
}

function useInvalidateProducts() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all })
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: (input: ProductInput) => productService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      productService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: (id: string) => productService.remove(id),
    onSuccess: invalidate,
  })
}