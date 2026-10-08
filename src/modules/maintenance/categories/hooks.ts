import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { categoryService } from "./service"
import type { CategoryInput } from "./schema"

export const categoryKeys = {
  all: ["categories"] as const,
  list: (params: PageParams) => [...categoryKeys.all, "list", params] as const,
  options: () => [...categoryKeys.all, "options"] as const,
}

export function useCategories(params: PageParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: ({ signal }) => categoryService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Hook de consulta rápida de opciones para selectores en otros módulos (Regla 0.5). */
export function useCategoryOptions() {
  const params: PageParams = { page: 1, size: 100, filters: { status: "active" } }
  return useQuery({
    queryKey: categoryKeys.options(),
    queryFn: ({ signal }) => categoryService.list(params, signal),
    select: (data) =>
      data.items.map((c) => ({
        id: c.id,
        name: c.name,
      })),
  })
}

/** Tras crear, editar o borrar se invalidan todas las consultas de categorías. */
function useInvalidateCategories() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: categoryKeys.all })
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: (input: CategoryInput) => categoryService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      categoryService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    onSuccess: invalidate,
  })
}