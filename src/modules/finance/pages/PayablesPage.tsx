import { useState } from "react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { useSupplierOptions } from "@/modules/maintenance"
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
  type Payable,
} from "../accounts/schema"
import { PaymentFormDialog, type PaymentDocument } from "../components/PaymentFormDialog"
import { usePayables } from "../hooks"

export default function PayablesPage() {
  const list = useListFilters(["supplier_id", "status"] as const)
  const payables = usePayables(list.params)
  const suppliers = useSupplierOptions({ includeInactive: true })
  const canPay = useHasPermission("finance.payments:create")
  const canSeeInvoices = useHasPermission("purchases.invoices:view")
  const [payFor, setPayFor] = useState<PaymentDocument | null>(null)

  const columns: Column<Payable>[] = [
    {
      key: "invoice",
      header: "Factura",
      cell: (row) =>
        canSeeInvoices ? (
          <Link className="font-mono text-sm underline" to={`/purchases/invoices/${row.invoice_id}`}>
            {row.invoice_code}
          </Link>
        ) : (
          <span className="font-mono text-sm">{row.invoice_code}</span>
        ),
    },
    { key: "supplier", header: "Proveedor", cell: (row) => <span className="font-medium">{row.supplier_name}</span> },
    { key: "due", header: "Vence", cell: (row) => formatBusinessDate(row.due_date) },
    { key: "total", header: "Total", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
    { key: "paid", header: "Pagado", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.paid)}</span> },
    { key: "balance", header: "Saldo", className: "text-right", cell: (row) => <span className="font-mono font-medium">{formatMoney(row.balance)}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={ACCOUNT_STATUS_TONES[row.status]} label={ACCOUNT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "actions",
      header: "Acciones",
      cell: (row) =>
        canPay && canRegisterPayment(row) ? (
          <Button variant="outline" size="sm" onClick={() => setPayFor({ id: row.invoice_id, label: `${row.invoice_code} · ${row.supplier_name}`, balance: row.balance })}>
            Registrar pago
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Cuentas por pagar"
        description="Nacen de las facturas de proveedor. El saldo y el estado vencido los calcula el sistema."
        query={payables}
        columns={columns}
        getRowKey={(row) => row.id}
        hasFilters={list.hasFilters}
        onClearFilters={list.clear}
        onPageChange={list.setPage}
        empty={{ title: "No hay cuentas por pagar", description: "Aparecen al registrar una factura de proveedor." }}
        toolbar={
          <>
            <Input
              type="search"
              className="max-w-xs"
              placeholder="Buscar por proveedor o factura"
              aria-label="Buscar cuentas por pagar"
              value={list.searchInput}
              onChange={(event) => list.setSearchInput(event.target.value)}
            />
            <FilterSelect
              label="Filtrar por proveedor"
              value={list.values.supplier_id}
              onChange={list.setFilter("supplier_id")}
              allLabel="Todos los proveedores"
              options={(suppliers.data ?? []).map((supplier) => ({ value: supplier.id, label: supplier.name }))}
              className="w-64"
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
      <PaymentFormDialog open={payFor !== null} onOpenChange={(open) => !open && setPayFor(null)} type="payment" document={payFor ?? undefined} />
    </>
  )
}
