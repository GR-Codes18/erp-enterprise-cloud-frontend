import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { productService } from "./service"
import type { Product, ProductCreateInput, ProductUpdateInput } from "./schema"

export const productKeys = {
  all: ["products"] as const,
  list: (params: PageParams) => [...productKeys.all, "list", params] as const,
  options: (includeInactive: boolean) => [...productKeys.all, "options", { includeInactive }] as const,
}

export function useProducts(params: PageParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => productService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export interface ProductOption {
  id: string
  sku: string
  /** Si el producto está inactivo, el nombre lo indica: "(inactivo)" */
  name: string
  unit: Product["unit"]
  /** Precio propuesto en ventas (editable en cada documento) */
  sale_price: string
  /** Costo propuesto en compras */
  cost_price: string
  status: Product["status"]
}

/**
 * Opciones de productos para selectores en Ventas/Compras/Inventario (regla 0.5).
 * Por defecto solo activos, filtrados por el servidor (documentos nuevos; los formularios
 * agregan aparte los inactivos que el documento ya usa). includeInactive es para filtros
 * de vistas de solo lectura, como el Kardex.
 */
export function useProductOptions({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const params: PageParams = {
    page: 1,
    size: 100,
    filters: includeInactive ? {} : { status: "active" },
  }
  return useQuery({
    queryKey: productKeys.options(includeInactive),
    queryFn: ({ signal }) => productService.list(params, signal),
    select: (data): ProductOption[] =>
      data.items.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.status === "active" ? p.name : `${p.name} (inactivo)`,
        unit: p.unit,
        sale_price: p.sale_price,
        cost_price: p.cost_price,
        status: p.status,
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
    mutationFn: (input: ProductCreateInput) => productService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductUpdateInput }) =>
      productService.update(id, input),
    onSuccess: invalidate,
  })
}

export function usePatchProduct() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Product> }) =>
      productService.patch(id, input),
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