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
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const [reason, setReason] = useState(FILTER_ALL)
  const filters: Record<string, string> = {}
  if (status !== FILTER_ALL) filters.status = status
  if (reason !== FILTER_ALL) filters.reason = reason
  const params: PageParams = { page, size: PAGE_SIZE, search, filters }
  const adjustments = useAdjustments(params)
  const hasFilters = search !== "" || Object.keys(filters).length > 0

  const columns: Column<Adjustment>[] = [
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

  const newAdjustmentButton = (
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

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          type="search"
          className="max-w-sm"
          placeholder="Buscar por almacén"
          aria-label="Buscar ajustes"
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
            {ADJUSTMENT_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>{ADJUSTMENT_STATUS_LABELS[value]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={reason}
          onValueChange={(value) => {
            setReason(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filtrar por motivo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todos los motivos</SelectItem>
            {ADJUSTMENT_REASONS.map((value) => (
              <SelectItem key={value} value={value}>{ADJUSTMENT_REASON_LABELS[value]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
