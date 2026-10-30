import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { roleService } from "./service"
import type { RoleInput } from "./schema"

export const roleKeys = {
  all: ["roles"] as const,
  list: (params: PageParams) => [...roleKeys.all, "list", params] as const,
  options: () => [...roleKeys.all, "options"] as const,
}

export function useRoles(params: PageParams) {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: ({ signal }) => roleService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export interface RoleOption {
  value: string
  label: string
}

/** Opciones para selectores de rol. Cuelga de roleKeys.all: al crear o editar roles se refresca sola. */
export function useRoleOptions() {
  return useQuery({
    queryKey: roleKeys.options(),
    queryFn: ({ signal }) => roleService.list({ page: 1, size: 100 }, signal),
    select: (data): RoleOption[] =>
      data.items.map((role) => ({ value: role.id, label: role.name })),
    staleTime: 5 * 60 * 1000,
  })
}

function useInvalidateRoles() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: roleKeys.all })
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: (input: RoleInput) => roleService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoleInput }) =>
      roleService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: (id: string) => roleService.remove(id),
    onSuccess: invalidate,
  })
}