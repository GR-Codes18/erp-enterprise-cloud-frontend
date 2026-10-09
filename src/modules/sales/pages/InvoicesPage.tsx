import { useState } from "react"
import { Link } from "react-router"
import { useCustomerOptions } from "@/modules/maintenance"
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
import { formatBusinessDate } from "@/shared/lib/dates"
import { FILTER_ALL, dateRangeParams, pickFilters } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import { useInvoices } from "../hooks"
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  INVOICE_TYPES,
  INVOICE_TYPE_LABELS,
  invoiceCode,
  type Invoice,
} from "../invoices/schema"

const PAGE_SIZE = 10

export default function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const [type, setType] = useState(FILTER_ALL)
  const [customerId, setCustomerId] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const customers = useCustomerOptions({ includeInactive: true })
  const filters = pickFilters({ status, type, customer_id: customerId })
  const invoices = useInvoices({ page, size: PAGE_SIZE, search, filters, ...dateRangeParams(dateFrom, dateTo) })
  const hasFilters = search !== "" || Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput("")
    setStatus(FILTER_ALL)
    setType(FILTER_ALL)
    setCustomerId(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: Column<Invoice>[] = [
    { key: "code", header: "Comprobante", cell: (row) => <span className="font-mono text-sm">{invoiceCode(row)}</span> },
    { key: "type", header: "Tipo", cell: (row) => INVOICE_TYPE_LABELS[row.type] },
    { key: "issue_date", header: "Emisión", cell: (row) => formatBusinessDate(row.issue_date) },
    { key: "customer", header: "Cliente", cell: (row) => <span className="font-medium">{row.customer_name}</span> },
    { key: "total", header: "Total", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
    { key: "balance", header: "Saldo", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.balance)}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={INVOICE_STATUS_TONES[row.status]} label={INVOICE_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/sales/invoices/${row.id}`}>Ver comprobante</Link>
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Comprobantes"
        description="Facturas y boletas emitidas desde pedidos confirmados. No se editan: se anulan con motivo."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          type="search"
          className="max-w-xs"
          placeholder="Buscar por número, cliente o pedido"
          aria-label="Buscar comprobantes"
          value={searchInput}
          onChange={(event) => withReset(setSearchInput)(event.target.value)}
        />
        <FilterSelect
          label="Filtrar por tipo"
          value={type}
          onChange={withReset(setType)}
          allLabel="Facturas y boletas"
          options={INVOICE_TYPES.map((value) => ({ value, label: INVOICE_TYPE_LABELS[value] }))}
          className="w-44"
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={withReset(setStatus)}
          allLabel="Todos los estados"
          options={INVOICE_STATUSES.map((value) => ({ value, label: INVOICE_STATUS_LABELS[value] }))}
        />
        <FilterSelect
          label="Filtrar por cliente"
          value={customerId}
          onChange={withReset(setCustomerId)}
          allLabel="Todos los clientes"
          options={(customers.data ?? []).map((customer) => ({ value: customer.id, label: customer.name }))}
          className="w-60"
        />
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={withReset(setDateFrom)} onToChange={withReset(setDateTo)} />
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {invoices.isError ? (
        <ErrorState message={getErrorMessage(invoices.error)} onRetry={() => void invoices.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={invoices.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={invoices.isPending}
            empty={
              hasFilters ? (
                <EmptyState title="Sin resultados" description="Ningún comprobante coincide con la búsqueda o los filtros." />
              ) : (
                <EmptyState title="Aún no hay comprobantes" description="Los comprobantes se emiten desde un pedido confirmado." />
              )
            }
          />
          <Pagination
            page={invoices.data?.page ?? 1}
            pages={invoices.data?.pages ?? 1}
            total={invoices.data?.total ?? 0}
            disabled={invoices.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
