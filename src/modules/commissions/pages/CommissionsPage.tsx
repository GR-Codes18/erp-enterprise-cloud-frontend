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
import { FILTER_ALL } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import { useCommissions, useDeleteCommission } from "../hooks"
import { COMMISSION_STATUSES, COMMISSION_STATUS_LABELS, type Commission, type CommissionStatus } from "../schema"
import { CommissionFormDialog } from "./CommissionFormDialog"

const PAGE_SIZE = 10
const STATUS_TONES: Record<CommissionStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  paid: "neutral",
}

export default function CommissionsPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState(FILTER_ALL)
  const search = useDebouncedValue(searchInput.trim(), 300)
  const commissions = useCommissions({
    page,
    size: PAGE_SIZE,
    search,
    filters: status === FILTER_ALL ? {} : { status },
  })
  const remove = useDeleteCommission()
  const [dialog, setDialog] = useState<{ open: boolean; commission: Commission | null }>({
    open: false,
    commission: null,
  })
  const [toDelete, setToDelete] = useState<Commission | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const columns: Column<Commission>[] = [
    { key: "seller", header: "Vendedor", cell: (row) => <span className="font-medium">{row.seller_name}</span> },
    { key: "period", header: "Período", cell: (row) => row.period },
    { key: "sales", header: "Ventas", className: "text-right", cell: (row) => formatMoney(row.sales_amount) },
    { key: "rate", header: "Tasa", className: "text-right", cell: (row) => `${row.rate_percentage}%` },
    { key: "commission", header: "Comisión", className: "text-right", cell: (row) => formatMoney(row.commission_amount) },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={STATUS_TONES[row.status]} label={COMMISSION_STATUS_LABELS[row.status]} />,
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`Editar comisión de ${row.seller_name}`} onClick={() => setDialog({ open: true, commission: row })}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Eliminar comisión de ${row.seller_name}`} onClick={() => setToDelete(row)}>
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]
  const createButton = (
    <Button onClick={() => setDialog({ open: true, commission: null })}>
      <Plus aria-hidden="true" /> Registrar comisión
    </Button>
  )

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      setActionError(null)
      setToDelete(null)
      if ((commissions.data?.items.length ?? 0) === 1 && page > 1) setPage(page - 1)
    } catch (error) {
      setActionError(getErrorMessage(error))
      setToDelete(null)
    }
  }

  return (
    <>
      <PageHeader title="Comisiones de vendedores" description="Calcula y administra las comisiones según las ventas de cada período." actions={createButton} />
      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Input
          type="search"
          className="w-full max-w-sm"
          placeholder="Buscar vendedor o período"
          aria-label="Buscar comisiones"
          value={searchInput}
          onChange={(event) => { setSearchInput(event.target.value); setPage(1) }}
        />
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={(value) => { setStatus(value); setPage(1) }}
          allLabel="Todos los estados"
          options={COMMISSION_STATUSES.map((value) => ({ value, label: COMMISSION_STATUS_LABELS[value] }))}
        />
      </div>
      {actionError && <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">{actionError}</p>}
      {commissions.isError ? (
        <ErrorState message={getErrorMessage(commissions.error)} onRetry={() => void commissions.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={commissions.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={commissions.isPending}
            empty={<EmptyState title="No hay comisiones" description="Ajusta los filtros o registra la primera comisión." action={createButton} />}
          />
          <Pagination
            page={commissions.data?.page ?? 1}
            pages={commissions.data?.pages ?? 1}
            total={commissions.data?.total ?? 0}
            disabled={commissions.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
      <CommissionFormDialog
        open={dialog.open}
        commission={dialog.commission}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => { if (!open) setToDelete(null) }}
        title="Eliminar comisión"
        description={`¿Seguro que quieres eliminar la comisión de "${toDelete?.seller_name ?? ""}" del período ${toDelete?.period ?? ""}? Esta acción no se puede deshacer.`}
        isLoading={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
