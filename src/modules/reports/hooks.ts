import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api/client"
import type { PageParams } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { Period } from "@/shared/lib/periods"
import type {
  LowStockRow,
  MonthlyPoint,
  OperationalReport,
  PurchasesReportRow,
  ReportPage,
  SalesReportRow,
  TopProduct,
} from "./schema"

type ReportRow = { sales: SalesReportRow; purchases: PurchasesReportRow; "low-stock": LowStockRow }

export const reportService = {
  operational: <R extends OperationalReport>(report: R, params: PageParams, signal?: AbortSignal) =>
    api.get<ReportPage<ReportRow[R]>>(`/reports/${report}`, { query: toListQuery(params), signal }),
  monthly: (period: Period, signal?: AbortSignal) =>
    api.get<MonthlyPoint[]>("/reports/analytics/monthly", { query: { ...period }, signal }),
  topProducts: (period: Period, signal?: AbortSignal) =>
    api.get<TopProduct[]>("/reports/analytics/top-products", { query: { ...period }, signal }),
}

export const useOperationalReport = <R extends OperationalReport>(report: R, params: PageParams) =>
  useQuery({
    queryKey: ["reports", report, params],
    queryFn: ({ signal }) => reportService.operational(report, params, signal),
    placeholderData: keepPreviousData,
  })

export const useMonthlyReport = (period: Period, enabled = true) =>
  useQuery({
    queryKey: ["reports", "monthly", period],
    queryFn: ({ signal }) => reportService.monthly(period, signal),
    enabled,
  })

export const useTopProducts = (period: Period) =>
  useQuery({
    queryKey: ["reports", "top-products", period],
    queryFn: ({ signal }) => reportService.topProducts(period, signal),
  })
