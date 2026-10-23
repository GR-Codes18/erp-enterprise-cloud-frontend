import { useState } from "react"
import { Link } from "react-router"
import { ArrowUpRight, ClipboardList } from "lucide-react"
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
import { formatDateTimeLima } from "@/shared/lib/dates"
import { FILTER_ALL, dateRangeParams, pickFilters } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import { useOrders } from "../hooks"
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_CONDITIONS,
  PAYMENT_CONDITION_LABELS,
  DELIVERY_METHOD_LABELS,
  SALE_TYPE_LABELS,
  getDeliveryStatusLabel,
  type Order,
} from "../orders/schema"

const PAGE_SIZE = 10

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const [customerId, setCustomerId] = useState(FILTER_ALL)
  const [condition, setCondition] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [customerSearchInput, setCustomerSearchInput] = useState("")
  const customerSearch = useDebouncedValue(customerSearchInput.trim(), 300)
  const canCreate = useHasPermission("sales.orders:create")

  const customers = useCustomerOptions({ includeInactive: true, search: customerSearch })
  const filters = pickFilters({ status, customer_id: customerId, payment_condition: condition })
  const orders = useOrders({ page, size: PAGE_SIZE, search, filters, ...dateRangeParams(dateFrom, dateTo) })
  const hasFilters = search !== "" || Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput("")
    setStatus(FILTER_ALL)
    setCustomerId(FILTER_ALL)
    setCondition(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: Column<Order>[] = [
    {
      key: "number",
      header: "Número",
      cell: (row) => <span className="inline-flex rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs">{row.number}</span>,
    },
    { key: "date", header: "Fecha", cell: (row) => formatDateTimeLima(row.created_at) },
    {
      key: "customer",
      header: "Cliente",
      cell: (row) => (
        <span className="font-medium">
          {row.customer_name}
          {!row.customer_id && <span className="ml-2 text-xs font-normal text-muted-foreground">Ocasional</span>}
        </span>
      ),
    },
    {
      key: "sale_type",
      header: "Tipo",
      cell: (row) => <span className="text-sm text-muted-foreground">{SALE_TYPE_LABELS[row.sale_type]}</span>,
    },
    {
      key: "delivery",
      header: "Entrega",
      cell: (row) =>
        row.sale_type === "wholesale" ? (
          <StatusBadge
            tone={
              row.delivery_status === "delivered" || row.delivery_status === "picked_up"
                ? "success"
                : row.delivery_status === "pending"
                  ? "neutral"
                  : "warning"
            }
            label={`${DELIVERY_METHOD_LABELS[row.delivery_method]} · ${getDeliveryStatusLabel(row.delivery_method, row.delivery_status)}`}
          />
        ) : (
          <span className="text-sm text-muted-foreground">Presencial</span>
        ),
    },
    {
      key: "condition",
      header: "Condición",
      cell: (row) =>
        row.payment_condition === "credit"
          ? `${PAYMENT_CONDITION_LABELS.credit} ${row.credit_days} días`
          : PAYMENT_CONDITION_LABELS.cash,
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      cell: (row) => <span className="font-mono text-sm font-semibold">{formatMoney(row.total)}</span>,
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={ORDER_STATUS_TONES[row.status]} label={ORDER_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <Link to={`/sales/orders/${row.id}`}>
            Ver detalle
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </Button>
      ),
    },
  ]

  const newOrderButton = canCreate && (
    <Button asChild>
      <Link to="/sales/orders/new">Nueva venta</Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Ventas comprometidas. Al confirmar se valida stock y crédito; luego se emite el comprobante."
        actions={newOrderButton}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex basis-full items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <ClipboardList aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Seguimiento de pedidos</p>
              <p className="text-xs text-muted-foreground">Busca y filtra tus ventas</p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {orders.data?.total ?? 0} resultados
          </span>
        </div>
        <Input
          type="search"
          className="max-w-xs"
          placeholder="Buscar por número o cliente"
          aria-label="Buscar pedidos"
          value={searchInput}
          onChange={(event) => withReset(setSearchInput)(event.target.value)}
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={withReset(setStatus)}
          allLabel="Todos los estados"
          options={ORDER_STATUSES.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] }))}
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
        <FilterSelect
          label="Filtrar por condición de pago"
          value={condition}
          onChange={withReset(setCondition)}
          allLabel="Contado y crédito"
          options={PAYMENT_CONDITIONS.map((value) => ({ value, label: PAYMENT_CONDITION_LABELS[value] }))}
          className="w-44"
        />
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={withReset(setDateFrom)} onToChange={withReset(setDateTo)} />
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-3 shadow-sm md:p-4" aria-label="Resultados de pedidos">
        {orders.isError ? (
          <ErrorState message={getErrorMessage(orders.error)} onRetry={() => void orders.refetch()} />
        ) : (
          <>
          <DataTable
            columns={columns}
            rows={orders.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={orders.isPending}
            empty={
              hasFilters ? (
                <EmptyState title="Sin resultados" description="Ningún pedido coincide con la búsqueda o los filtros." />
              ) : (
                <EmptyState title="Aún no hay pedidos" description="Crea un pedido o convierte una cotización aceptada." action={newOrderButton} />
              )
            }
          />
          <Pagination
            page={orders.data?.page ?? 1}
            pages={orders.data?.pages ?? 1}
            total={orders.data?.total ?? 0}
            disabled={orders.isFetching}
            onPageChange={setPage}
          />
          </>
        )}
      </section>
    </>
  )
}
