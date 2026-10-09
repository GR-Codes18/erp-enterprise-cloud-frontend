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
import { supplierInvoiceHooks } from "../hooks"
import {
  SUPPLIER_INVOICE_STATUSES,
  SUPPLIER_INVOICE_STATUS_LABELS,
  SUPPLIER_INVOICE_STATUS_TONES,
  supplierInvoiceCode,
  type SupplierInvoice,
} from "../invoices/schema"

export default function SupplierInvoicesPage() {
  const list = useListFilters(["status", "supplier_id"] as const)
  const invoices = supplierInvoiceHooks.useList(list.params)
  const suppliers = useSupplierOptions({ includeInactive: true })
  const canCreate = useHasPermission("purchases.invoices:create")

  const columns: Column<SupplierInvoice>[] = [
    { key: "code", header: "Factura", cell: (row) => <span className="font-mono text-sm">{supplierInvoiceCode(row)}</span> },
    { key: "supplier", header: "Proveedor", cell: (row) => <span className="font-medium">{row.supplier_name}</span> },
    { key: "issue", header: "Emisión", cell: (row) => formatBusinessDate(row.issue_date) },
    { key: "due", header: "Vence", cell: (row) => formatBusinessDate(row.due_date) },
    { key: "total", header: "Total", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
    { key: "balance", header: "Saldo", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.balance)}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          <StatusBadge tone={SUPPLIER_INVOICE_STATUS_TONES[row.status]} label={SUPPLIER_INVOICE_STATUS_LABELS[row.status]} />
          {row.warning && row.status !== "void" && <StatusBadge tone="warning" label="Total con diferencia" />}
        </span>
      ),
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/purchases/invoices/${row.id}`}>Ver factura</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && (
    <Button asChild>
      <Link to="/purchases/invoices/new">Registrar factura</Link>
    </Button>
  )

  return (
    <ListPageLayout
      title="Facturas de proveedor"
      description="Facturas recibidas contra una orden de compra. Cada una genera su cuenta por pagar."
      actions={newButton}
      query={invoices}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "Aún no hay facturas de proveedor", description: "Registra la factura cuando llegue la mercadería.", action: newButton }}
      toolbar={
        <>
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por serie, número, proveedor u orden"
            aria-label="Buscar facturas de proveedor"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por estado"
            value={list.values.status}
            onChange={list.setFilter("status")}
            allLabel="Todos los estados"
            options={SUPPLIER_INVOICE_STATUSES.map((value) => ({ value, label: SUPPLIER_INVOICE_STATUS_LABELS[value] }))}
          />
          <FilterSelect
            label="Filtrar por proveedor"
            value={list.values.supplier_id}
            onChange={list.setFilter("supplier_id")}
            allLabel="Todos los proveedores"
            options={(suppliers.data ?? []).map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            className="w-64"
          />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
