import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { useWarehouseOptions } from "@/modules/maintenance"
import type { Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { receptionHooks } from "../hooks"
import { RECEPTION_STATUSES, RECEPTION_STATUS_LABELS, RECEPTION_STATUS_TONES, type Reception } from "../receptions/schema"

export default function ReceptionsPage() {
  const list = useListFilters(["status", "warehouse_id"] as const)
  const receptions = receptionHooks.useList(list.params)
  const warehouses = useWarehouseOptions({ includeInactive: true })
  const canCreate = useHasPermission("purchases.receptions:create")

  const columns: Column<Reception>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "date", header: "Fecha", cell: (row) => formatDateTimeLima(row.created_at) },
    { key: "order", header: "Orden", cell: (row) => <span className="font-mono text-sm">{row.order_number}</span> },
    { key: "supplier", header: "Proveedor", cell: (row) => <span className="font-medium">{row.supplier_name}</span> },
    { key: "warehouse", header: "Almacén", cell: (row) => row.warehouse_name },
    { key: "guide", header: "Guía", cell: (row) => row.guide_number },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={RECEPTION_STATUS_TONES[row.status]} label={RECEPTION_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/purchases/receptions/${row.id}`}>Ver recepción</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && (
    <Button asChild>
      <Link to="/purchases/receptions/new">Nueva recepción</Link>
    </Button>
  )

  return (
    <ListPageLayout
      title="Recepciones"
      description="Lo que llega del proveedor contra una orden. Al confirmar sube el stock y es inmutable."
      actions={newButton}
      query={receptions}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "Aún no hay recepciones", description: "Registra una recepción desde una orden emitida.", action: newButton }}
      toolbar={
        <>
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por número, orden, proveedor o guía"
            aria-label="Buscar recepciones"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por estado"
            value={list.values.status}
            onChange={list.setFilter("status")}
            allLabel="Todos los estados"
            options={RECEPTION_STATUSES.map((value) => ({ value, label: RECEPTION_STATUS_LABELS[value] }))}
          />
          <FilterSelect
            label="Filtrar por almacén"
            value={list.values.warehouse_id}
            onChange={list.setFilter("warehouse_id")}
            allLabel="Todos los almacenes"
            options={(warehouses.data ?? []).map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
            className="w-60"
          />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
