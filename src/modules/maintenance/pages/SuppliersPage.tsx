import { useState } from "react"
import { useHasPermission } from "@/modules/auth"
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
import { FilterSelect } from "@/shared/components/FilterSelect"
import { FILTER_ALL, pickFilters } from "@/shared/lib/filters"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { useDeleteOrDeactivate } from "@/shared/hooks/useDeleteOrDeactivate"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { SupplierFormDialog } from "../suppliers/components/SupplierFormDialog"
import { useDeleteSupplier, usePatchSupplier, useSuppliers } from "../suppliers/hooks"
import { SUPPLIER_STATUSES, STATUS_LABELS, type Supplier } from "../suppliers/schema"

const PAGE_SIZE = 10

export default function SuppliersPage() {
  const [page, setPage] = useState(1)
  // Regla 1: el frontend oculta lo que no se permite (el backend vuelve a validar)
  const canCreate = useHasPermission("maintenance.suppliers:create")
  const canEdit = useHasPermission("maintenance.suppliers:edit")
  const canVoid = useHasPermission("maintenance.suppliers:void")
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState(FILTER_ALL)
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; supplier: Supplier | null }>({
    open: false,
    supplier: null,
  })
  const [toDelete, setToDelete] = useState<Supplier | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const suppliers = useSuppliers({ page, size: PAGE_SIZE, search, filters: pickFilters({ status }) })
  const deleteSupplier = useDeleteSupplier()
  const patchSupplier = usePatchSupplier()

  const {
    isInUseDialogOpen,
    inUseMessage,
    setIsInUseDialogOpen,
    isDeleting,
    isDeactivating,
    handleDelete,
    handleConfirmDeactivate,
  } = useDeleteOrDeactivate<Supplier>({
    resourceName: "Proveedor",
    onDelete: async (item) => {
      await deleteSupplier.mutateAsync(item.id)
      if ((suppliers.data?.items.length ?? 0) === 1 && page > 1) {
        setPage(page - 1)
      }
    },
    onDeactivate: async (item) => {
      await patchSupplier.mutateAsync({ id: item.id, input: { status: "inactive" } })
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

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Proveedor",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "document",
      header: "Documento",
      cell: (row) => `${row.document_type} ${row.document_number}`,
    },
    { key: "email", header: "Correo", cell: (row) => row.email || "—" },
    { key: "phone", header: "Teléfono", cell: (row) => row.phone || "—" },
    {
      key: "credit_days",
      header: "Días de crédito",
      className: "text-right",
      cell: (row) => `${row.credit_days} días`,
    },
    {
      key: "status",
      header: "Estado",
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
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${row.name}`}
              onClick={() => setDialog({ open: true, supplier: row })}
            >
              <Pencil aria-hidden="true" />
            </Button>
          )}
          {canVoid && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar ${row.name}`}
              onClick={() => setToDelete(row)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const newSupplierButton = canCreate && (
    <Button onClick={() => setDialog({ open: true, supplier: null })}>
      <Plus aria-hidden="true" />
      Nuevo proveedor
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Proveedores"
        description="Administra los proveedores de la empresa."
        actions={newSupplierButton}
      />

      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="w-full max-w-sm">
          <Input
            type="search"
            placeholder="Buscar por nombre, documento o correo"
            aria-label="Buscar proveedores"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          allLabel="Todos los estados"
          options={SUPPLIER_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      {suppliers.isError ? (
        <ErrorState
          message={getErrorMessage(suppliers.error)}
          onRetry={() => void suppliers.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={suppliers.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={suppliers.isPending}
            empty={
              search || status !== FILTER_ALL ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún proveedor coincide con tu búsqueda o filtro."
                />
              ) : (
                <EmptyState
                  title="Aún no hay proveedores"
                  description="Crea el primero para empezar."
                  action={newSupplierButton}
                />
              )
            }
          />
          <Pagination
            page={suppliers.data?.page ?? 1}
            pages={suppliers.data?.pages ?? 1}
            total={suppliers.data?.total ?? 0}
            disabled={suppliers.isFetching}
            onPageChange={setPage}
          />
        </>
      )}

      <SupplierFormDialog
        open={dialog.open}
        supplier={dialog.supplier}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Eliminar proveedor"
        description={`¿Seguro que quieres eliminar a "${toDelete?.name ?? ""}"? Esta acción no se puede deshacer.`}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <InUseDialog
        open={isInUseDialogOpen}
        message={inUseMessage}
        onOpenChange={setIsInUseDialogOpen}
        resourceName="Proveedor"
        isPending={isDeactivating}
        onDeactivate={handleConfirmDeactivate}
      />
    </>
  )
}