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
import { formatBusinessDate, formatDateTimeLima } from "@/shared/lib/dates"
import { requestHooks } from "../hooks"
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, REQUEST_STATUS_TONES, type PurchaseRequest } from "../requests/schema"

export default function RequestsPage() {
  const list = useListFilters(["status"] as const)
  const requests = requestHooks.useList(list.params)
  const canCreate = useHasPermission("purchases.requests:create")

  const columns: Column<PurchaseRequest>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "date", header: "Fecha", cell: (row) => formatDateTimeLima(row.created_at) },
    { key: "requested_by", header: "Solicitante", cell: (row) => row.requested_by_name },
    { key: "needed_by", header: "Se necesita", cell: (row) => formatBusinessDate(row.needed_by) },
    { key: "items", header: "Productos", className: "text-right", cell: (row) => row.items.length },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={REQUEST_STATUS_TONES[row.status]} label={REQUEST_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/purchases/requests/${row.id}`}>Ver solicitud</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && (
    <Button asChild>
      <Link to="/purchases/requests/new">Nueva solicitud</Link>
    </Button>
  )

  return (
    <ListPageLayout
      title="Solicitudes de compra"
      description="Necesidades internas de compra. Las aprueba alguien distinto de quien las pide."
      actions={newButton}
      query={requests}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "Aún no hay solicitudes", description: "Crea una solicitud para pedir una compra.", action: newButton }}
      toolbar={
        <>
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por número, solicitante o justificación"
            aria-label="Buscar solicitudes"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por estado"
            value={list.values.status}
            onChange={list.setFilter("status")}
            allLabel="Todos los estados"
            options={REQUEST_STATUSES.map((value) => ({ value, label: REQUEST_STATUS_LABELS[value] }))}
            className="w-56"
          />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
