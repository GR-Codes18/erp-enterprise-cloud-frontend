import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { userService } from "./service"
import type { UserInput } from "./schema"

export const userKeys = {
  all: ["users"] as const,
  list: (params: PageParams) => [...userKeys.all, "list", params] as const,
  options: () => [...userKeys.all, "options"] as const,
}

export interface UserOption {
  value: string
  label: string
  /** Para que quien consuma el hook pueda excluir inactivos (regla 4 del manual) */
  active: boolean
}

export function useUsers(params: PageParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => userService.list(params, signal),
    // Mientras carga otra página se sigue viendo la anterior (sin parpadeo)
    placeholderData: keepPreviousData,
  })
}

/**
 * Opciones para selectores de usuario en otros módulos (regla 0.5).
 * Incluye inactivos: la auditoría y los documentos antiguos los siguen mostrando.
 * Un documento nuevo debe filtrar por `active`.
 */
export function useUserOptions() {
  return useQuery({
    queryKey: userKeys.options(),
    queryFn: ({ signal }) => userService.list({ page: 1, size: 100 }, signal),
    select: (data): UserOption[] =>
      data.items.map((user) => ({
        value: user.id,
        label: user.name,
        active: user.status === "active",
      })),
    staleTime: 5 * 60 * 1000,
  })
}

/** Tras crear o editar se invalidan los listados y las opciones de usuarios. */
function useInvalidateUsers() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all })
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: (input: UserInput) => userService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserInput }) =>
      userService.update(id, input),
    onSuccess: invalidate,
  })
}