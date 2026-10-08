import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { userService } from "./service"
import type { UserInput } from "./schema"

export const userKeys = {
  all: ["users"] as const,
  list: (params: PageParams) => [...userKeys.all, "list", params] as const,
}

export function useUsers(params: PageParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => userService.list(params, signal),
    // Mientras carga otra página se sigue viendo la anterior (sin parpadeo)
    placeholderData: keepPreviousData,
  })
}

/** Tras crear o editar se invalidan todos los listados de usuarios. */
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