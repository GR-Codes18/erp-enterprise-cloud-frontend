import { useState } from "react"
import { Link } from "react-router"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import type { PageParams } from "@/shared/lib/api/types"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { FILTER_ALL } from "../stock/schema"
import { useTransfers } from "../transfers/hooks"
import {
  TRANSFER_STATUSES,
  TRANSFER_STATUS_LABELS,
  type Transfer,
} from "../transfers/schema"

const PAGE_SIZE = 10

export default function TransfersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const params: PageParams = {
    page,
    size: PAGE_SIZE,
    search,
    filters: status === FILTER_ALL ? {} : { status },
  }
  const transfers = useTransfers(params)
  const hasFilters = search !== "" || status !== FILTER_ALL

  const columns: Column<Transfer>[] = [
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

  const newTransferButton = (
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

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          type="search"
          className="max-w-sm"
          placeholder="Buscar por almacén"
          aria-label="Buscar transferencias"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
            setPage(1)
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todos los estados</SelectItem>
            {TRANSFER_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>{TRANSFER_STATUS_LABELS[value]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
