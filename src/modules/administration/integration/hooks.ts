import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api/client"
import type { Paginated } from "@/shared/lib/api/types"
import type { IntegrationFlowStats, IntegrationNotification } from "./types"

// Se consulta cada pocos segundos: lo que ocurre en otros módulos aparece sin recargar
const REFRESH_MS = 5_000

export function useIntegrationFlows() {
  return useQuery({
    queryKey: ["administration", "integration", "flows"],
    queryFn: ({ signal }) => api.get<IntegrationFlowStats[]>("/integration/flows", { signal }),
    refetchInterval: REFRESH_MS,
    refetchOnMount: "always",
  })
}

export function useIntegrationNotifications() {
  return useQuery({
    queryKey: ["administration", "integration", "notifications"],
    queryFn: ({ signal }) =>
      api.get<Paginated<IntegrationNotification>>("/integration/notifications", { query: { page: 1, size: 8 }, signal }),
    refetchInterval: REFRESH_MS,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  })
}
