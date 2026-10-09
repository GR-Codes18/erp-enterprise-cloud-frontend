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
import { formatMoney } from "@/shared/lib/money"
import { CustomerFormDialog } from "../customers/components/CustomerFormDialog"
import { useCustomers, useDeleteCustomer, usePatchCustomer } from "../customers/hooks"
import { STATUS_LABELS, type Customer } from "../customers/schema"

const PAGE_SIZE = 10

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; customer: Customer | null }>({
    open: false,
    customer: null,
  })
  const [toDelete, setToDelete] = useState<Customer | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const customers = useCustomers({ page, size: PAGE_SIZE, search })
  const deleteCustomer = useDeleteCustomer()
  const patchCustomer = usePatchCustomer()

  const {
    isInUseDialogOpen,
    setIsInUseDialogOpen,
    isDeleting,
    isDeactivating,
    handleDelete,
    handleConfirmDeactivate,
  } = useDeleteOrDeactivate<Customer>({
    resourceName: "Cliente",
    onDelete: async (item) => {
      await deleteCustomer.mutateAsync(item.id)
      if ((customers.data?.items.length ?? 0) === 1 && page > 1) {
        setPage(page - 1)
      }
    },
    onDeactivate: async (item) => {
      await patchCustomer.mutateAsync({ id: item.id, input: { status: "inactive" } })
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

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Cliente",
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
      key: "credit_limit",
      header: "Límite de crédito",
      className: "text-right",
      cell: (row) => formatMoney(row.credit_limit),
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
            onClick={() => setDialog({ open: true, customer: row })}
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

  const newCustomerButton = (
    <Button onClick={() => setDialog({ open: true, customer: null })}>
      <Plus aria-hidden="true" />
      Nuevo cliente
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Administra los clientes de la empresa."
        actions={newCustomerButton}
      />

      <div className="mb-4 max-w-sm">
        <Input
          type="search"
          placeholder="Buscar por nombre, documento o correo"
          aria-label="Buscar clientes"
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

      {customers.isError ? (
        <ErrorState
          message={getErrorMessage(customers.error)}
          onRetry={() => void customers.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={customers.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={customers.isPending}
            empty={
              search ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún cliente coincide con tu búsqueda."
                />
              ) : (
                <EmptyState
                  title="Aún no hay clientes"
                  description="Crea el primero para empezar."
                  action={newCustomerButton}
                />
              )
            }
          />
          <Pagination
            page={customers.data?.page ?? 1}
            pages={customers.data?.pages ?? 1}
            total={customers.data?.total ?? 0}
            disabled={customers.isFetching}
            onPageChange={setPage}
          />
        </>
      )}

      <CustomerFormDialog
        open={dialog.open}
        customer={dialog.customer}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Eliminar cliente"
        description={`¿Seguro que quieres eliminar a "${toDelete?.name ?? ""}"? Esta acción no se puede deshacer.`}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <InUseDialog
        open={isInUseDialogOpen}
        onOpenChange={setIsInUseDialogOpen}
        resourceName="Cliente"
        isPending={isDeactivating}
        onDeactivate={handleConfirmDeactivate}
      />
    </>
  )
}