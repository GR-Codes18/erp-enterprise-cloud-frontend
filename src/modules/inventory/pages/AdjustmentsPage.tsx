import { useState } from "react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { useWarehouseOptions } from "@/modules/maintenance"
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
import type { PageParams } from "@/shared/lib/api/types"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { FILTER_ALL, dateRangeParams, pickFilters } from "@/shared/lib/filters"
import { useAdjustments } from "../adjustments/hooks"
import {
  ADJUSTMENT_REASON_LABELS,
  ADJUSTMENT_REASONS,
  ADJUSTMENT_STATUSES,
  ADJUSTMENT_STATUS_LABELS,
  type Adjustment,
} from "../adjustments/schema"

const PAGE_SIZE = 10

export default function AdjustmentsPage() {
  const [page, setPage] = useState(1)
  const canCreate = useHasPermission("inventory.adjustments:create")
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const [reason, setReason] = useState(FILTER_ALL)
  const [warehouseId, setWarehouseId] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Es un listado histórico: también se filtra por almacenes hoy inactivos
  const warehouses = useWarehouseOptions({ includeInactive: true })

  const filters = pickFilters({ status, reason, warehouse_id: warehouseId })
  const params: PageParams = {
    page,
    size: PAGE_SIZE,
    search,
    filters,
    ...dateRangeParams(dateFrom, dateTo),
  }
  const adjustments = useAdjustments(params)
  const hasFilters = search !== "" || Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  // Cada cambio de filtro vuelve a la página 1
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput("")
    setStatus(FILTER_ALL)
    setReason(FILTER_ALL)
    setWarehouseId(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: Column<Adjustment>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "date", header: "Fecha", cell: (row) => formatDateTimeLima(row.created_at) },
    { key: "warehouse", header: "Almacén", cell: (row) => <span className="font-medium">{row.warehouse_name}</span> },
    { key: "reason", header: "Motivo", cell: (row) => ADJUSTMENT_REASON_LABELS[row.reason] },
    { key: "items", header: "Productos", className: "text-right", cell: (row) => row.items.length },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={row.status === "applied" ? "success" : "neutral"} label={ADJUSTMENT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/inventory/adjustments/${row.id}`}>Ver ajuste</Link>
        </Button>
      ),
    },
  ]

  const newAdjustmentButton = canCreate && (
    <Button asChild>
      <Link to="/inventory/adjustments/new">Nuevo ajuste</Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Ajustes"
        description="Registra diferencias del inventario físico con motivo obligatorio y aprobación."
        actions={newAdjustmentButton}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          type="search"
          className="max-w-sm"
          placeholder="Buscar por número o almacén"
          aria-label="Buscar ajustes"
          value={searchInput}
          onChange={(event) => withReset(setSearchInput)(event.target.value)}
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={withReset(setStatus)}
          allLabel="Todos los estados"
          options={ADJUSTMENT_STATUSES.map((value) => ({ value, label: ADJUSTMENT_STATUS_LABELS[value] }))}
        />
        <FilterSelect
          label="Filtrar por almacén"
          value={warehouseId}
          onChange={withReset(setWarehouseId)}
          allLabel="Todos los almacenes"
          options={(warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name }))}
          className="w-56"
        />
        <FilterSelect
          label="Filtrar por motivo"
          value={reason}
          onChange={withReset(setReason)}
          allLabel="Todos los motivos"
          options={ADJUSTMENT_REASONS.map((value) => ({ value, label: ADJUSTMENT_REASON_LABELS[value] }))}
        />
        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onFromChange={withReset(setDateFrom)}
          onToChange={withReset(setDateTo)}
        />
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {adjustments.isError ? (
        <ErrorState message={getErrorMessage(adjustments.error)} onRetry={() => void adjustments.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={adjustments.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={adjustments.isPending}
            empty={
              hasFilters ? (
                <EmptyState title="Sin resultados" description="Ningún ajuste coincide con la búsqueda o los filtros." />
              ) : (
                <EmptyState title="Aún no hay ajustes" description="Registra el primer ajuste para dejar constancia de un conteo o incidencia." action={newAdjustmentButton} />
              )
            }
          />
          <Pagination
            page={adjustments.data?.page ?? 1}
            pages={adjustments.data?.pages ?? 1}
            total={adjustments.data?.total ?? 0}
            disabled={adjustments.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
