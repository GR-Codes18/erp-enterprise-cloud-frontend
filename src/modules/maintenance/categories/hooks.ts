import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { categoryService } from "./service"
import type { Category, CategoryInput } from "./schema"

export const categoryKeys = {
  all: ["categories"] as const,
  list: (params: PageParams) => [...categoryKeys.all, "list", params] as const,
  options: (includeId?: string) => [...categoryKeys.all, "options", includeId] as const,
}

export function useCategories(params: PageParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: ({ signal }) => categoryService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

interface UseCategoryOptionsProps {
  includeId?: string
}

/** Hook de consulta rápida de opciones para selectores en otros módulos (Regla 0.5 + D5). */
export function useCategoryOptions({ includeId }: UseCategoryOptionsProps = {}) {
  const params: PageParams = { page: 1, size: 100 }

  return useQuery({
    queryKey: categoryKeys.options(includeId),
    queryFn: async ({ signal }) => {
      const data = await categoryService.list(params, signal)
      let items = data.items

      if (includeId && !items.some((c) => c.id === includeId && c.status === "active")) {
        const existing = items.find((c) => c.id === includeId)
        if (!existing) {
          try {
            const specificCategory = await categoryService.getById(includeId, signal)
            items = [...items, specificCategory]
          } catch {
            // Si falla la búsqueda individual, mantiene la lista recuperada
          }
        }
      }

      return items
        .filter((c) => c.status === "active" || c.id === includeId)
        .map((c) => ({
          id: c.id,
          name: c.status === "active" ? c.name : `${c.name} (inactiva)`,
          status: c.status,
        }))
    },
  })
}

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

export function usePatchCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Category> }) =>
      categoryService.patch(id, input),
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