import { useQuery } from "@tanstack/react-query"
import { roleService } from "./service"

export const roleKeys = {
  all: ["roles"] as const,
  options: () => [...roleKeys.all, "options"] as const,
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