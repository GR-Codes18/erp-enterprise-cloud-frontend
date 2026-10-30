import { useState } from "react"
import { Download } from "lucide-react"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { PageHeader } from "@/shared/components/PageHeader"
import { StatusBadge, type StatusTone } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { FILTER_ALL } from "@/shared/lib/filters"
import { formatCents, formatMoney, toCents } from "@/shared/lib/money"
import { COMMISSION_STATUSES, COMMISSION_STATUS_LABELS, type Commission, type CommissionStatus } from "../schema"
import { useCommissions } from "../hooks"

const STATUS_TONES: Record<CommissionStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  paid: "neutral",
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export default function CommissionHistoryPage() {
  const [searchInput, setSearchInput] = useState("")
  const [period, setPeriod] = useState("")
  const [status, setStatus] = useState(FILTER_ALL)
  const search = useDebouncedValue(searchInput.trim(), 300)
  const commissions = useCommissions({
    page: 1,
    size: 100,
    search,
    filters: {
      ...(period ? { period } : {}),
      ...(status === FILTER_ALL ? {} : { status }),
    },
  })
  const rows = commissions.data?.items ?? []
  const totalSales = rows.reduce((total, row) => total + toCents(row.sales_amount), 0)
  const totalCommissions = rows.reduce((total, row) => total + toCents(row.commission_amount), 0)

  const columns: Column<Commission>[] = [
    { key: "seller", header: "Vendedor", cell: (row) => <span className="font-medium">{row.seller_name}</span> },
    { key: "period", header: "Período", cell: (row) => row.period },
    { key: "sales", header: "Ventas", className: "text-right", cell: (row) => formatMoney(row.sales_amount) },
    { key: "rate", header: "Tasa", className: "text-right", cell: (row) => `${row.rate_percentage}%` },
    { key: "commission", header: "Comisión", className: "text-right", cell: (row) => formatMoney(row.commission_amount) },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={STATUS_TONES[row.status]} label={COMMISSION_STATUS_LABELS[row.status]} />,
    },
  ]

  const exportCsv = () => {
    const header = ["Vendedor", "Periodo", "Ventas", "Tasa", "Comision", "Estado"]
    const content = [
      header.map(csvCell).join(","),
      ...rows.map((row) =>
        [row.seller_name, row.period, row.sales_amount, `${row.rate_percentage}%`, row.commission_amount, COMMISSION_STATUS_LABELS[row.status]]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n")
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `historial-comisiones-${period || "todos"}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title="Historial y reporte"
        description="Consulta el historial de comisiones calculadas por vendedor y periodo, y exporta el resultado."
        actions={<Button variant="outline" onClick={exportCsv} disabled={commissions.isPending || rows.length === 0}><Download aria-hidden="true" /> Exportar CSV</Button>}
      />
      <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Reporte de demostración basado en las comisiones generadas. Los datos se mantienen en memoria y se reinician al recargar la aplicación.
      </p>
      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Input
          type="search"
          className="w-full max-w-sm"
          placeholder="Buscar vendedor"
          aria-label="Buscar historial de comisiones"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Input
          type="month"
          className="w-full max-w-[190px]"
          aria-label="Filtrar por periodo"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={setStatus}
          allLabel="Todos los estados"
          options={COMMISSION_STATUSES.map((value) => ({ value, label: COMMISSION_STATUS_LABELS[value] }))}
        />
      </div>
      {commissions.isError ? (
        <ErrorState message={getErrorMessage(commissions.error)} onRetry={() => void commissions.refetch()} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Registros del reporte</p>
              <p className="mt-1 text-2xl font-semibold">{commissions.data?.total ?? 0}</p>
            </article>
            <article className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Ventas del resultado</p>
              <p className="mt-1 text-2xl font-semibold">{formatCents(totalSales)}</p>
            </article>
            <article className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Comisiones del resultado</p>
              <p className="mt-1 text-2xl font-semibold">{formatCents(totalCommissions)}</p>
            </article>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            isLoading={commissions.isPending}
            empty={<EmptyState title="No hay comisiones para mostrar" description="Cambia los filtros para consultar otros registros." />}
          />
        </>
      )}
    </>
  )
}
