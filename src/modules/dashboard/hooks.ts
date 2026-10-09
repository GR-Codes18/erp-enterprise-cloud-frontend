import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api/client"
import type { Period } from "@/shared/lib/periods"
import type { Dashboard } from "./schema"

export const dashboardService = {
  get: (period: Period, signal?: AbortSignal) => api.get<Dashboard>("/reports/dashboard", { query: { ...period }, signal }),
}

export const useDashboard = (period: Period) =>
  useQuery({
    queryKey: ["dashboard", period],
    queryFn: ({ signal }) => dashboardService.get(period, signal),
    placeholderData: keepPreviousData,
  })
