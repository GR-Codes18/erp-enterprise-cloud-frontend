import { useState } from "react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { useCustomerOptions } from "@/modules/maintenance"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { EntityPickerDialog } from "@/shared/components/EntityPickerDialog"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate } from "@/shared/lib/dates"
import { FILTER_ALL, dateRangeParams, pickFilters } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import { useQuotes } from "../hooks"
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, QUOTE_STATUS_TONES, type Quote } from "../quotes/schema"

const PAGE_SIZE = 10

export default function QuotesPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const [customerId, setCustomerId] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [customerSearchInput, setCustomerSearchInput] = useState("")
  const customerSearch = useDebouncedValue(customerSearchInput.trim(), 300)
  const canCreate = useHasPermission("sales.quotes:create")

  // Consulta histórica: también se filtra por clientes hoy inactivos
  const customers = useCustomerOptions({ includeInactive: true, search: customerSearch })
  const filters = pickFilters({ status, customer_id: customerId })
  const quotes = useQuotes({ page, size: PAGE_SIZE, search, filters, ...dateRangeParams(dateFrom, dateTo) })
  const hasFilters = search !== "" || Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  // Cada cambio de filtro vuelve a la página 1
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput("")
    setStatus(FILTER_ALL)
    setCustomerId(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: Column<Quote>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "issue_date", header: "Emisión", cell: (row) => formatBusinessDate(row.issue_date) },
    { key: "customer", header: "Cliente", cell: (row) => <span className="font-medium">{row.customer_name}</span> },
    { key: "valid_until", header: "Válida hasta", cell: (row) => formatBusinessDate(row.valid_until) },
    { key: "total", header: "Total", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={QUOTE_STATUS_TONES[row.status]} label={QUOTE_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/sales/quotes/${row.id}`}>Ver cotización</Link>
        </Button>
      ),
    },
  ]

  const newQuoteButton = canCreate && (
    <Button asChild>
      <Link to="/sales/quotes/new">Nueva cotización</Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        description="Propuestas de venta para el cliente. No reservan stock ni comprometen nada."
        actions={newQuoteButton}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Input
          type="search"
          className="max-w-xs"
          placeholder="Buscar por número o cliente"
          aria-label="Buscar cotizaciones"
          value={searchInput}
          onChange={(event) => withReset(setSearchInput)(event.target.value)}
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={withReset(setStatus)}
          allLabel="Todos los estados"
          options={QUOTE_STATUSES.map((value) => ({ value, label: QUOTE_STATUS_LABELS[value] }))}
        />
        <EntityPickerDialog
          aria-label="Filtrar por cliente"
          value={customerId}
          onValueChange={withReset(setCustomerId)}
          onSearchChange={setCustomerSearchInput}
          isLoading={customers.isFetching}
          errorMessage={customers.isError ? getErrorMessage(customers.error) : undefined}
          searchPlaceholder="Buscar por nombre o documento"
          placeholder="Todos los clientes"
          allOption={{ value: FILTER_ALL, label: "Todos los clientes" }}
          options={(customers.data ?? []).map((customer) => ({
            value: customer.id,
            label: `${customer.name} · ${customer.document_type} ${customer.document_number}`,
          }))}
          disabled={customers.isPending}
          className="w-60"
        />
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={withReset(setDateFrom)} onToChange={withReset(setDateTo)} />
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {quotes.isError ? (
        <ErrorState message={getErrorMessage(quotes.error)} onRetry={() => void quotes.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={quotes.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={quotes.isPending}
            empty={
              hasFilters ? (
                <EmptyState title="Sin resultados" description="Ninguna cotización coincide con la búsqueda o los filtros." />
              ) : (
                <EmptyState title="Aún no hay cotizaciones" description="Crea una cotización para proponer una venta." action={newQuoteButton} />
              )
            }
          />
          <Pagination
            page={quotes.data?.page ?? 1}
            pages={quotes.data?.pages ?? 1}
            total={quotes.data?.total ?? 0}
            disabled={quotes.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
