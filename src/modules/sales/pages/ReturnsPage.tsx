import { useState } from "react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { FILTER_ALL, dateRangeParams, pickFilters } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import { useReturns } from "../hooks"
import { RETURN_STATUSES, RETURN_STATUS_LABELS, RETURN_STATUS_TONES, type SalesReturn } from "../returns/schema"

const PAGE_SIZE = 10

export default function ReturnsPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const canCreate = useHasPermission("sales.returns:create")

  const filters = pickFilters({ status })
  const returns = useReturns({ page, size: PAGE_SIZE, search, filters, ...dateRangeParams(dateFrom, dateTo) })
  const hasFilters = search !== "" || Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput("")
    setStatus(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: Column<SalesReturn>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "date", header: "Fecha", cell: (row) => formatDateTimeLima(row.created_at) },
    { key: "invoice", header: "Comprobante", cell: (row) => <span className="font-mono text-sm">{row.invoice_code}</span> },
    { key: "customer", header: "Cliente", cell: (row) => <span className="font-medium">{row.customer_name}</span> },
    { key: "total", header: "Nota de crédito", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={RETURN_STATUS_TONES[row.status]} label={RETURN_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/sales/returns/${row.id}`}>Ver devolución</Link>
        </Button>
      ),
    },
  ]

  const newReturnButton = canCreate && (
    <Button asChild>
      <Link to="/sales/returns/new">Nueva devolución</Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Devoluciones"
        description="Productos devueltos por el cliente. Al confirmar se emite la nota de crédito y el stock reingresa."
        actions={newReturnButton}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          type="search"
          className="max-w-xs"
          placeholder="Buscar por número, comprobante o cliente"
          aria-label="Buscar devoluciones"
          value={searchInput}
          onChange={(event) => withReset(setSearchInput)(event.target.value)}
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={withReset(setStatus)}
          allLabel="Todos los estados"
          options={RETURN_STATUSES.map((value) => ({ value, label: RETURN_STATUS_LABELS[value] }))}
        />
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={withReset(setDateFrom)} onToChange={withReset(setDateTo)} />
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {returns.isError ? (
        <ErrorState message={getErrorMessage(returns.error)} onRetry={() => void returns.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={returns.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={returns.isPending}
            empty={
              hasFilters ? (
                <EmptyState title="Sin resultados" description="Ninguna devolución coincide con la búsqueda o los filtros." />
              ) : (
                <EmptyState title="Aún no hay devoluciones" description="Registra una devolución desde un comprobante emitido." action={newReturnButton} />
              )
            }
          />
          <Pagination
            page={returns.data?.page ?? 1}
            pages={returns.data?.pages ?? 1}
            total={returns.data?.total ?? 0}
            disabled={returns.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
