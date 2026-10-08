import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { SupplierFormDialog } from "../suppliers/components/SupplierFormDialog"
import { useDeleteSupplier, useSuppliers } from "../suppliers/hooks"
import { STATUS_LABELS, type Supplier } from "../suppliers/schema"

const PAGE_SIZE = 10

export default function SuppliersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; supplier: Supplier | null }>({
    open: false,
    supplier: null,
  })
  const [toDelete, setToDelete] = useState<Supplier | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const suppliers = useSuppliers({ page, size: PAGE_SIZE, search })
  const deleteSupplier = useDeleteSupplier()

  const handleConfirmDelete = () => {
    if (!toDelete) return
    deleteSupplier.mutate(toDelete.id, {
      onSuccess: () => {
        if ((suppliers.data?.items.length ?? 0) === 1 && page > 1) setPage(page - 1)
        setToDelete(null)
      },
      onError: (error) => {
        setToDelete(null)
        setActionError(getErrorMessage(error))
      },
    })
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
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${row.name}`}
            onClick={() => setDialog({ open: true, supplier: row })}
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

  const newSupplierButton = (
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

      <div className="mb-4 max-w-sm">
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
              search ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún proveedor coincide con tu búsqueda."
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
        isLoading={deleteSupplier.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}