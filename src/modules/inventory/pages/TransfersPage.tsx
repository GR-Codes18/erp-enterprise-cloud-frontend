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
import { useTransfers } from "../transfers/hooks"
import {
  TRANSFER_STATUSES,
  TRANSFER_STATUS_LABELS,
  type Transfer,
} from "../transfers/schema"

const PAGE_SIZE = 10

export default function TransfersPage() {
  const [page, setPage] = useState(1)
  const canCreate = useHasPermission("inventory.transfers:create")
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const [originId, setOriginId] = useState(FILTER_ALL)
  const [destinationId, setDestinationId] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Es un listado histórico: también se filtra por almacenes hoy inactivos
  const warehouses = useWarehouseOptions({ includeInactive: true })
  const warehouseOptions = (warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name }))

  const filters = pickFilters({
    status,
    origin_warehouse_id: originId,
    destination_warehouse_id: destinationId,
  })
  const params: PageParams = {
    page,
    size: PAGE_SIZE,
    search,
    filters,
    ...dateRangeParams(dateFrom, dateTo),
  }
  const transfers = useTransfers(params)
  const hasFilters = search !== "" || Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  // Cada cambio de filtro vuelve a la página 1
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput("")
    setStatus(FILTER_ALL)
    setOriginId(FILTER_ALL)
    setDestinationId(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: Column<Transfer>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    {
      key: "created_at",
      header: "Fecha",
      cell: (row) => formatDateTimeLima(row.created_at),
    },
    {
      key: "route",
      header: "Ruta",
      cell: (row) => (
        <span className="font-medium">
          {row.origin_warehouse_name} → {row.destination_warehouse_name}
        </span>
      ),
    },
    { key: "items", header: "Productos", className: "text-right", cell: (row) => row.items.length },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={row.status === "received" ? "success" : "neutral"} label={TRANSFER_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/inventory/transfers/${row.id}`}>Ver transferencia</Link>
        </Button>
      ),
    },
  ]

  const newTransferButton = canCreate && (
    <Button asChild>
      <Link to="/inventory/transfers/new">Nueva transferencia</Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Transferencias"
        description="Traslada productos entre almacenes y sigue su envío hasta la recepción."
        actions={newTransferButton}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Input
          type="search"
          className="max-w-sm"
          placeholder="Buscar por número o almacén"
          aria-label="Buscar transferencias"
          value={searchInput}
          onChange={(event) => withReset(setSearchInput)(event.target.value)}
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={withReset(setStatus)}
          allLabel="Todos los estados"
          options={TRANSFER_STATUSES.map((value) => ({ value, label: TRANSFER_STATUS_LABELS[value] }))}
        />
        <FilterSelect
          label="Filtrar por almacén de origen"
          value={originId}
          onChange={withReset(setOriginId)}
          allLabel="Todos los orígenes"
          options={warehouseOptions}
          className="w-56"
        />
        <FilterSelect
          label="Filtrar por almacén de destino"
          value={destinationId}
          onChange={withReset(setDestinationId)}
          allLabel="Todos los destinos"
          options={warehouseOptions}
          className="w-56"
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

      {transfers.isError ? (
        <ErrorState message={getErrorMessage(transfers.error)} onRetry={() => void transfers.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={transfers.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={transfers.isPending}
            empty={
              hasFilters ? (
                <EmptyState title="Sin resultados" description="Ninguna transferencia coincide con la búsqueda o el filtro." />
              ) : (
                <EmptyState title="Aún no hay transferencias" description="Crea una transferencia para mover productos entre almacenes." action={newTransferButton} />
              )
            }
          />
          <Pagination
            page={transfers.data?.page ?? 1}
            pages={transfers.data?.pages ?? 1}
            total={transfers.data?.total ?? 0}
            disabled={transfers.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
