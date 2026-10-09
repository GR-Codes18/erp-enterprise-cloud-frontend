import { useState } from "react"
import { Printer } from "lucide-react"
import { useCustomerOptions, useSupplierOptions } from "@/modules/maintenance"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { PeriodSelect } from "@/shared/components/PeriodSelect"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { getErrorMessage } from "@/shared/lib/api/errors"
import type { PageParams } from "@/shared/lib/api/types"
import { formatBusinessDate, todayInLima } from "@/shared/lib/dates"
import { FILTER_ALL, pickFilters } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import { periodRange, type PeriodPreset } from "@/shared/lib/periods"
import { useOperationalReport } from "../hooks"
import {
  OPERATIONAL_REPORTS,
  OPERATIONAL_REPORT_LABELS,
  type LowStockRow,
  type OperationalReport,
  type PurchasesReportRow,
  type SalesReportRow,
} from "../schema"

/** Para imprimir más filas se elige una página más grande (máximo del contrato: 100) */
const PAGE_SIZES = ["10", "50", "100"] as const

const salesColumns: Column<SalesReportRow>[] = [
  { key: "code", header: "Comprobante", cell: (row) => <span className="font-mono text-sm">{row.code}</span> },
  { key: "type", header: "Tipo", cell: (row) => row.type_label },
  { key: "date", header: "Emisión", cell: (row) => formatBusinessDate(row.issue_date) },
  { key: "customer", header: "Cliente", cell: (row) => row.customer_name },
  { key: "status", header: "Estado", cell: (row) => row.status_label },
  { key: "total", header: "Total", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
]

const purchasesColumns: Column<PurchasesReportRow>[] = [
  { key: "code", header: "Factura", cell: (row) => <span className="font-mono text-sm">{row.code}</span> },
  { key: "date", header: "Emisión", cell: (row) => formatBusinessDate(row.issue_date) },
  { key: "supplier", header: "Proveedor", cell: (row) => row.supplier_name },
  { key: "status", header: "Estado", cell: (row) => row.status_label },
  { key: "total", header: "Total", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
]

const lowStockColumns: Column<LowStockRow>[] = [
  { key: "sku", header: "SKU", cell: (row) => <span className="font-mono text-sm">{row.sku}</span> },
  { key: "product", header: "Producto", cell: (row) => row.product_name },
  { key: "stock", header: "Stock", className: "text-right", cell: (row) => `${row.stock} ${row.unit}` },
  { key: "min", header: "Mínimo", className: "text-right", cell: (row) => row.min_stock },
  { key: "shortfall", header: "Faltan", className: "text-right", cell: (row) => <span className="font-medium">{row.shortfall}</span> },
]

function ReportTable<T>({
  report,
  params,
  columns,
  getRowKey,
  onPageChange,
}: {
  report: OperationalReport
  params: PageParams
  columns: Column<T>[]
  getRowKey: (row: T) => string
  onPageChange: (page: number) => void
}) {
  const query = useOperationalReport(report, params)
  if (query.isError) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
  const data = query.data as { items: T[]; page: number; pages: number; total: number; sum: string } | undefined
  return (
    <>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        getRowKey={getRowKey}
        isLoading={query.isPending}
        empty={<EmptyState title="Sin resultados" description="No hay registros para el periodo y los filtros elegidos." />}
      />
      {data && data.sum && (
        <p className="mt-3 text-right text-sm">
          {data.total} registros. Total del periodo (sin anulados): <span className="font-mono font-semibold">{formatMoney(data.sum)}</span>
        </p>
      )}
      <div className="print:hidden">
        <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} disabled={query.isFetching} onPageChange={onPageChange} />
      </div>
    </>
  )
}

export default function OperationalReportsPage() {
  const [report, setReport] = useState<OperationalReport>("sales")
  const [preset, setPreset] = useState<PeriodPreset>("quarter")
  const [partyId, setPartyId] = useState(FILTER_ALL)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>("10")
  const customers = useCustomerOptions({ includeInactive: true })
  const suppliers = useSupplierOptions({ includeInactive: true })

  const period = periodRange(preset, todayInLima())
  const partyKey = report === "sales" ? "customer_id" : "supplier_id"
  const params: PageParams = {
    page,
    size: Number(pageSize),
    filters: report === "low-stock" ? {} : pickFilters({ [partyKey]: partyId }),
    ...(report === "low-stock" ? {} : period),
  }
  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title={OPERATIONAL_REPORT_LABELS[report]}
        description={report === "low-stock" ? "Situación actual del inventario." : `Del ${formatBusinessDate(period.date_from)} al ${formatBusinessDate(period.date_to)}.`}
        actions={
          <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden" role="group" aria-label="Filtros del reporte">
        <div className="flex flex-wrap gap-1 rounded-md border p-1" role="tablist" aria-label="Reporte">
          {OPERATIONAL_REPORTS.map((value) => (
            <Button
              key={value}
              role="tab"
              aria-selected={report === value}
              variant={report === value ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setReport(value)
                setPartyId(FILTER_ALL)
                setPage(1)
              }}
            >
              {OPERATIONAL_REPORT_LABELS[value]}
            </Button>
          ))}
        </div>
        {report !== "low-stock" && <PeriodSelect value={preset} onChange={reset(setPreset)} />}
        <Select value={pageSize} onValueChange={(value) => reset(setPageSize)(value as (typeof PAGE_SIZES)[number])}>
          <SelectTrigger className="w-36" aria-label="Filas por página">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size} por página
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {report === "sales" && (
          <FilterSelect
            label="Filtrar por cliente"
            value={partyId}
            onChange={reset(setPartyId)}
            allLabel="Todos los clientes"
            options={(customers.data ?? []).map((customer) => ({ value: customer.id, label: customer.name }))}
            className="w-60"
          />
        )}
        {report === "purchases" && (
          <FilterSelect
            label="Filtrar por proveedor"
            value={partyId}
            onChange={reset(setPartyId)}
            allLabel="Todos los proveedores"
            options={(suppliers.data ?? []).map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            className="w-64"
          />
        )}
      </div>

      {report === "sales" && <ReportTable report="sales" params={params} columns={salesColumns} getRowKey={(row) => row.invoice_id} onPageChange={setPage} />}
      {report === "purchases" && (
        <ReportTable report="purchases" params={params} columns={purchasesColumns} getRowKey={(row) => row.invoice_id} onPageChange={setPage} />
      )}
      {report === "low-stock" && (
        <ReportTable report="low-stock" params={params} columns={lowStockColumns} getRowKey={(row) => row.product_id} onPageChange={setPage} />
      )}
    </>
  )
}
