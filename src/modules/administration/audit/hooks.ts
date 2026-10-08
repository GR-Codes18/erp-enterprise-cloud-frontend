import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { auditService } from "./service"

export const auditKeys = {
  all: ["audit"] as const,
  list: (params: PageParams) => [...auditKeys.all, "list", params] as const,
}

export function useAuditEvents(params: PageParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: ({ signal }) => auditService.list(params, signal),
    // Mientras carga otra página se sigue viendo la anterior (sin parpadeo)
    placeholderData: keepPreviousData,
  })
}