import { useQuery } from "@tanstack/react-query"
import { permissionService } from "./service"

export const permissionKeys = {
  all: ["permissions"] as const,
  catalog: () => [...permissionKeys.all, "catalog"] as const,
}

/** Catálogo completo de pantallas y acciones. Casi nunca cambia, por eso se guarda un buen rato. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: permissionKeys.catalog(),
    queryFn: ({ signal }) => permissionService.list({ page: 1, size: 100 }, signal),
    select: (data) => data.items,
    staleTime: 30 * 60 * 1000,
  })
}