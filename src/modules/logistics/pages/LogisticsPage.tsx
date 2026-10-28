import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge, type StatusTone } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate } from "@/shared/lib/dates"
import { FILTER_ALL } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import { useDeleteShipment, useShipments } from "../hooks"
import { SHIPMENT_STATUSES, SHIPMENT_STATUS_LABELS, type Shipment, type ShipmentStatus } from "../schema"
import { ShipmentFormDialog } from "./ShipmentFormDialog"

const PAGE_SIZE = 10
const STATUS_TONES: Record<ShipmentStatus, StatusTone> = {
  planned: "neutral",
  in_transit: "warning",
  delivered: "success",
  cancelled: "danger",
}

export default function LogisticsPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState(FILTER_ALL)
  const search = useDebouncedValue(searchInput.trim(), 300)
  const shipments = useShipments({
    page,
    size: PAGE_SIZE,
    search,
    filters: status === FILTER_ALL ? {} : { status },
  })
  const remove = useDeleteShipment()
  const [dialog, setDialog] = useState<{ open: boolean; shipment: Shipment | null }>({
    open: false,
    shipment: null,
  })
  const [toDelete, setToDelete] = useState<Shipment | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const columns: Column<Shipment>[] = [
    { key: "reference", header: "Referencia", cell: (row) => <span className="font-medium">{row.reference}</span> },
    { key: "transporter", header: "Transportista", cell: (row) => row.transporter },
    { key: "route", header: "Ruta", cell: (row) => `${row.origin} → ${row.destination}` },
    { key: "scheduled_date", header: "Fecha", cell: (row) => formatBusinessDate(row.scheduled_date) },
    { key: "freight", header: "Flete", className: "text-right", cell: (row) => formatMoney(row.freight_amount) },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={STATUS_TONES[row.status]} label={SHIPMENT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`Editar ${row.reference}`} onClick={() => setDialog({ open: true, shipment: row })}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Eliminar ${row.reference}`} onClick={() => setToDelete(row)}>
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]
  const createButton = (
    <Button onClick={() => setDialog({ open: true, shipment: null })}>
      <Plus aria-hidden="true" /> Programar transporte
    </Button>
  )

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      setActionError(null)
      setToDelete(null)
      if ((shipments.data?.items.length ?? 0) === 1 && page > 1) setPage(page - 1)
    } catch (error) {
      setActionError(getErrorMessage(error))
      setToDelete(null)
    }
  }

  return (
    <>
      <PageHeader title="Logística y transporte" description="Programa y da seguimiento a los envíos y sus costos." actions={createButton} />
      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Input
          type="search"
          className="w-full max-w-sm"
          placeholder="Buscar referencia, transportista o ruta"
          aria-label="Buscar transportes"
          value={searchInput}
          onChange={(event) => { setSearchInput(event.target.value); setPage(1) }}
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={(value) => { setStatus(value); setPage(1) }}
          allLabel="Todos los estados"
          options={SHIPMENT_STATUSES.map((value) => ({ value, label: SHIPMENT_STATUS_LABELS[value] }))}
        />
      </div>
      {actionError && <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">{actionError}</p>}
      {shipments.isError ? (
        <ErrorState message={getErrorMessage(shipments.error)} onRetry={() => void shipments.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={shipments.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={shipments.isPending}
            empty={<EmptyState title="No hay transportes" description="Ajusta los filtros o programa el primer envío." action={createButton} />}
          />
          <Pagination
            page={shipments.data?.page ?? 1}
            pages={shipments.data?.pages ?? 1}
            total={shipments.data?.total ?? 0}
            disabled={shipments.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
      <ShipmentFormDialog
        open={dialog.open}
        shipment={dialog.shipment}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => { if (!open) setToDelete(null) }}
        title="Eliminar transporte"
        description={`¿Seguro que quieres eliminar "${toDelete?.reference ?? ""}"? Esta acción no se puede deshacer.`}
        isLoading={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
