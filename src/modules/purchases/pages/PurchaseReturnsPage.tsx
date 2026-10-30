import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import type { Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { purchaseReturnHooks } from "../hooks"
import {
  PURCHASE_RETURN_STATUSES,
  PURCHASE_RETURN_STATUS_LABELS,
  PURCHASE_RETURN_STATUS_TONES,
  type PurchaseReturn,
} from "../returns/schema"

export default function PurchaseReturnsPage() {
  const list = useListFilters(["status"] as const)
  const returns = purchaseReturnHooks.useList(list.params)
  const canCreate = useHasPermission("purchases.returns:create")

  const columns: Column<PurchaseReturn>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "date", header: "Fecha", cell: (row) => formatDateTimeLima(row.created_at) },
    { key: "reception", header: "Recepción", cell: (row) => <span className="font-mono text-sm">{row.reception_number}</span> },
    { key: "supplier", header: "Proveedor", cell: (row) => <span className="font-medium">{row.supplier_name}</span> },
    { key: "total", header: "Monto", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.total)}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={PURCHASE_RETURN_STATUS_TONES[row.status]} label={PURCHASE_RETURN_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/purchases/returns/${row.id}`}>Ver devolución</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && (
    <Button asChild>
      <Link to="/purchases/returns/new">Nueva devolución</Link>
    </Button>
  )

  return (
    <ListPageLayout
      title="Devoluciones al proveedor"
      description="Mercadería devuelta contra una recepción. Al confirmar baja el stock y la deuda con el proveedor."
      actions={newButton}
      query={returns}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "Aún no hay devoluciones al proveedor", description: "Registra una devolución desde una recepción confirmada.", action: newButton }}
      toolbar={
        <>
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por número, recepción o proveedor"
            aria-label="Buscar devoluciones al proveedor"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por estado"
            value={list.values.status}
            onChange={list.setFilter("status")}
            allLabel="Todos los estados"
            options={PURCHASE_RETURN_STATUSES.map((value) => ({ value, label: PURCHASE_RETURN_STATUS_LABELS[value] }))}
          />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
