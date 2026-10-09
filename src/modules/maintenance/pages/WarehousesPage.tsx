import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import InUseDialog from "@/shared/components/InUseDialog"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { useDeleteOrDeactivate } from "@/shared/hooks/useDeleteOrDeactivate"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { WarehouseFormDialog } from "../warehouses/components/WarehouseFormDialog"
import { useDeleteWarehouse, usePatchWarehouse, useWarehouses } from "../warehouses/hooks"
import { STATUS_LABELS, type Warehouse } from "../warehouses/schema"

const PAGE_SIZE = 10

export default function WarehousesPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; warehouse: Warehouse | null }>({
    open: false,
    warehouse: null,
  })
  const [toDelete, setToDelete] = useState<Warehouse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const warehouses = useWarehouses({ page, size: PAGE_SIZE, search })
  const deleteWarehouse = useDeleteWarehouse()
  const patchWarehouse = usePatchWarehouse()

  const {
    isInUseDialogOpen,
    setIsInUseDialogOpen,
    isDeleting,
    isDeactivating,
    handleDelete,
    handleConfirmDeactivate,
  } = useDeleteOrDeactivate<Warehouse>({
    resourceName: "Almacén",
    onDelete: async (item) => {
      await deleteWarehouse.mutateAsync(item.id)
      if ((warehouses.data?.items.length ?? 0) === 1 && page > 1) {
        setPage(page - 1)
      }
    },
    onDeactivate: async (item) => {
      await patchWarehouse.mutateAsync({ id: item.id, input: { status: "inactive" } })
    },
    onError: (msg) => setActionError(msg),
    onSuccess: () => setActionError(null),
  })

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)
    await handleDelete(target)
  }

  const columns: Column<Warehouse>[] = [
    {
      key: "code",
      header: "Código",
      className: "w-32",
      cell: (row) => <span className="font-mono text-sm font-medium">{row.code}</span>,
    },
    {
      key: "name",
      header: "Nombre del Almacén",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "address",
      header: "Dirección",
      cell: (row) => <span className="text-muted-foreground">{row.address || "—"}</span>,
    },
    {
      key: "status",
      header: "Estado",
      className: "w-28",
      cell: (row) => (
        <StatusBadge
          tone={row.status === "active" ? "success" : "neutral"}
          label={STATUS_LABELS[row.status]}
        />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${row.name}`}
            onClick={() => setDialog({ open: true, warehouse: row })}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Eliminar ${row.name}`}
            onClick={() => setToDelete(row)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  const newWarehouseButton = (
    <Button onClick={() => setDialog({ open: true, warehouse: null })}>
      <Plus aria-hidden="true" />
      Nuevo almacén
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Almacenes"
        description="Administra los almacenes y puntos de depósito de la empresa."
        actions={newWarehouseButton}
      />

      <div className="mb-4 max-w-sm">
        <Input
          type="search"
          placeholder="Buscar por código o nombre..."
          aria-label="Buscar almacenes"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
            setPage(1)
          }}
        />
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      {warehouses.isError ? (
        <ErrorState
          message={getErrorMessage(warehouses.error)}
          onRetry={() => void warehouses.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={warehouses.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={warehouses.isPending}
            empty={
              search ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún almacén coincide con tu búsqueda."
                />
              ) : (
                <EmptyState
                  title="Aún no hay almacenes"
                  description="Crea el primero para empezar a gestionar el inventario."
                  action={newWarehouseButton}
                />
              )
            }
          />
          <Pagination
            page={warehouses.data?.page ?? 1}
            pages={warehouses.data?.pages ?? 1}
            total={warehouses.data?.total ?? 0}
            disabled={warehouses.isFetching}
            onPageChange={setPage}
          />
        </>
      )}

      <WarehouseFormDialog
        open={dialog.open}
        warehouse={dialog.warehouse}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Eliminar almacén"
        description={`¿Seguro que quieres eliminar el almacén "${toDelete?.name ?? ""}"? Esta acción no se puede deshacer.`}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <InUseDialog
        open={isInUseDialogOpen}
        onOpenChange={setIsInUseDialogOpen}
        resourceName="Almacén"
        isPending={isDeactivating}
        onDeactivate={handleConfirmDeactivate}
      />
    </>
  )
}