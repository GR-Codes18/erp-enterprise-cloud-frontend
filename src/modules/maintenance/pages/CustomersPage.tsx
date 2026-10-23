import { useState } from "react"
import { useHasPermission } from "@/modules/auth"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import InUseDialog from "@/shared/components/InUseDialog"
import { ExportCsvButton } from "@/shared/components/ExportCsvButton"
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
import { formatMoney } from "@/shared/lib/money"
import { CustomerFormDialog } from "../customers/components/CustomerFormDialog"
import { useCustomers, useDeleteCustomer, usePatchCustomer } from "../customers/hooks"
import { CUSTOMER_STATUSES, DOCUMENT_TYPES, STATUS_LABELS, type Customer } from "../customers/schema"

const PAGE_SIZE = 10

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  // Regla 1: el frontend oculta lo que no se permite (el backend vuelve a validar)
  const canCreate = useHasPermission("maintenance.customers:create")
  const canEdit = useHasPermission("maintenance.customers:edit")
  const canVoid = useHasPermission("maintenance.customers:void")
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState(FILTER_ALL)
  const [documentType, setDocumentType] = useState(FILTER_ALL)
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; customer: Customer | null }>({
    open: false,
    customer: null,
  })
  const [toDelete, setToDelete] = useState<Customer | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const customers = useCustomers({ page, size: PAGE_SIZE, search, filters: pickFilters({ status, document_type: documentType }) })
  const deleteCustomer = useDeleteCustomer()
  const patchCustomer = usePatchCustomer()

  const {
    isInUseDialogOpen,
    inUseMessage,
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
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${row.name}`}
              onClick={() => setDialog({ open: true, customer: row })}
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

  const exportButton = (
    <ExportCsvButton
      filename="clientes"
      rows={customers.data?.items ?? []}
      columns={[
      { header: "Tipo de documento", value: (row) => row.document_type },
      { header: "Número de documento", value: (row) => row.document_number },
      { header: "Nombre", value: (row) => row.name },
      { header: "Correo", value: (row) => row.email },
      { header: "Teléfono", value: (row) => row.phone },
      { header: "Dirección", value: (row) => row.address },
      { header: "Límite de crédito (S/)", value: (row) => row.credit_limit },
      { header: "Estado", value: (row) => STATUS_LABELS[row.status] },
      ]}
    />
  )

  const newCustomerButton = canCreate && (
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
        actions={<>{exportButton}{newCustomerButton}</>}
      />

      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="w-full max-w-sm">
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
        <FilterSelect
          label="Filtrar por estado"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          allLabel="Todos los estados"
          options={CUSTOMER_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
        <FilterSelect
          label="Filtrar por tipo de documento"
          value={documentType}
          onChange={(value) => {
            setDocumentType(value)
            setPage(1)
          }}
          allLabel="Todos los documentos"
          options={DOCUMENT_TYPES.map((value) => ({ value, label: value }))}
        />
        {(search || status !== FILTER_ALL || documentType !== FILTER_ALL) && (
          <Button
            variant="outline"
            onClick={() => {
              setDocumentType(FILTER_ALL); setSearchInput("")
              setStatus(FILTER_ALL)
              setPage(1)
            }}
          >
            Limpiar filtros
          </Button>
        )}
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
              search || status !== FILTER_ALL || documentType !== FILTER_ALL ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún cliente coincide con tu búsqueda o filtro."
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
        message={inUseMessage}
        onOpenChange={setIsInUseDialogOpen}
        resourceName="Cliente"
        isPending={isDeactivating}
        onDeactivate={handleConfirmDeactivate}
      />
    </>
  )
}