import { useState } from "react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { useCustomerOptions } from "@/modules/maintenance"
import type { Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { formatBusinessDate } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_TONES,
  canRegisterPayment,
  type Receivable,
} from "../accounts/schema"
import { PaymentFormDialog, type PaymentDocument } from "../components/PaymentFormDialog"
import { useReceivables } from "../hooks"

export default function ReceivablesPage() {
  const list = useListFilters(["customer_id", "status"] as const)
  const receivables = useReceivables(list.params)
  const customers = useCustomerOptions({ includeInactive: true })
  const canCollect = useHasPermission("finance.payments:create")
  const canSeeInvoices = useHasPermission("sales.invoices:view")
  const [collectFor, setCollectFor] = useState<PaymentDocument | null>(null)

  const columns: Column<Receivable>[] = [
    {
      key: "invoice",
      header: "Comprobante",
      cell: (row) =>
        canSeeInvoices ? (
          <Link className="font-mono text-sm underline" to={`/sales/invoices/${row.invoice_id}`}>
            {row.invoice_code}
          </Link>
        ) : (
          <span className="font-mono text-sm">{row.invoice_code}</span>
        ),
    },
    { key: "customer", header: "Cliente", cell: (row) => <span className="font-medium">{row.customer_name}</span> },
    { key: "due", header: "Vence", cell: (row) => formatBusinessDate(row.due_date) },
    { key: "total", header: "Total", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
    { key: "paid", header: "Cobrado", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.paid)}</span> },
    { key: "balance", header: "Saldo", className: "text-right", cell: (row) => <span className="font-mono font-medium">{formatMoney(row.balance)}</span> },
    {
      key: "status",
      header: "Estado",
      // "Vencida" lo calcula el backend; se dice con texto, no solo con color
      cell: (row) => <StatusBadge tone={ACCOUNT_STATUS_TONES[row.status]} label={ACCOUNT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "actions",
      header: "Acciones",
      cell: (row) =>
        canCollect && canRegisterPayment(row) ? (
          <Button variant="outline" size="sm" onClick={() => setCollectFor({ id: row.invoice_id, label: `${row.invoice_code} · ${row.customer_name}`, balance: row.balance })}>
            Registrar cobro
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Cuentas por cobrar"
        description="Nacen de los comprobantes a crédito. El saldo y el estado vencido los calcula el sistema."
        query={receivables}
        columns={columns}
        getRowKey={(row) => row.id}
        hasFilters={list.hasFilters}
        onClearFilters={list.clear}
        onPageChange={list.setPage}
        empty={{ title: "No hay cuentas por cobrar", description: "Aparecen al emitir un comprobante a crédito." }}
        toolbar={
          <>
            <Input
              type="search"
              className="max-w-xs"
              placeholder="Buscar por cliente o comprobante"
              aria-label="Buscar cuentas por cobrar"
              value={list.searchInput}
              onChange={(event) => list.setSearchInput(event.target.value)}
            />
            <FilterSelect
              label="Filtrar por cliente"
              value={list.values.customer_id}
              onChange={list.setFilter("customer_id")}
              allLabel="Todos los clientes"
              options={(customers.data ?? []).map((customer) => ({ value: customer.id, label: customer.name }))}
              className="w-60"
            />
            <FilterSelect
              label="Filtrar por estado"
              value={list.values.status}
              onChange={list.setFilter("status")}
              allLabel="Todos los estados"
              options={ACCOUNT_STATUSES.map((value) => ({ value, label: ACCOUNT_STATUS_LABELS[value] }))}
            />
            <DateRangeFilter
              idPrefix="due"
              fromLabel="Vence desde"
              toLabel="Vence hasta"
              from={list.dateFrom}
              to={list.dateTo}
              onFromChange={list.setDateFrom}
              onToChange={list.setDateTo}
            />
          </>
        }
      />
      <PaymentFormDialog
        open={collectFor !== null}
        onOpenChange={(open) => !open && setCollectFor(null)}
        type="collection"
        document={collectFor ?? undefined}
      />
    </>
  )
}
