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
import { CategoryFormDialog } from "@/modules/maintenance/categories/components/CategoryFormDialog"
import { useCategories, useDeleteCategory, usePatchCategory } from "@/modules/maintenance/categories/hooks"
import { CATEGORY_STATUSES, STATUS_LABELS, type Category } from "@/modules/maintenance/categories/schema"

const PAGE_SIZE = 10

export default function CategoriesPage() {
  const [page, setPage] = useState(1)
  // Regla 1: el frontend oculta lo que no se permite (el backend vuelve a validar)
  const canCreate = useHasPermission("maintenance.categories:create")
  const canEdit = useHasPermission("maintenance.categories:edit")
  const canVoid = useHasPermission("maintenance.categories:void")
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState(FILTER_ALL)
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  })
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const categories = useCategories({ page, size: PAGE_SIZE, search, filters: pickFilters({ status }) })
  const deleteCategory = useDeleteCategory()
  const patchCategory = usePatchCategory()

  const {
    isInUseDialogOpen,
    inUseMessage,
    setIsInUseDialogOpen,
    isDeleting,
    isDeactivating,
    handleDelete,
    handleConfirmDeactivate,
  } = useDeleteOrDeactivate<Category>({
    resourceName: "Categoría",
    onDelete: async (item) => {
      await deleteCategory.mutateAsync(item.id)
      if ((categories.data?.items.length ?? 0) === 1 && page > 1) {
        setPage(page - 1)
      }
    },
    onDeactivate: async (item) => {
      await patchCategory.mutateAsync({ id: item.id, input: { status: "inactive" } })
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

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: "Categoría",
      cell: (row) => <span className="font-medium">{row.name}</span>,
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
              onClick={() => setDialog({ open: true, category: row })}
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

  const newCategoryButton = canCreate && (
    <Button onClick={() => setDialog({ open: true, category: null })}>
      <Plus aria-hidden="true" />
      Nueva categoría
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Administra las categorías de productos de la empresa."
        actions={newCategoryButton}
      />

      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="w-full max-w-sm">
          <Input
            type="search"
            placeholder="Buscar por nombre de categoría"
            aria-label="Buscar categorías"
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
          allLabel="Todas los estados"
          options={CATEGORY_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      {categories.isError ? (
        <ErrorState
          message={getErrorMessage(categories.error)}
          onRetry={() => void categories.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={categories.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={categories.isPending}
            empty={
              search || status !== FILTER_ALL ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ninguna categoría coincide con tu búsqueda o filtro."
                />
              ) : (
                <EmptyState
                  title="Aún no hay categorías"
                  description="Crea la primera para empezar."
                  action={newCategoryButton}
                />
              )
            }
          />
          <Pagination
            page={categories.data?.page ?? 1}
            pages={categories.data?.pages ?? 1}
            total={categories.data?.total ?? 0}
            disabled={categories.isFetching}
            onPageChange={setPage}
          />
        </>
      )}

      <CategoryFormDialog
        open={dialog.open}
        category={dialog.category}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Eliminar categoría"
        description={`¿Seguro que quieres eliminar la categoría "${toDelete?.name ?? ""}"? Esta acción no se puede deshacer.`}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <InUseDialog
        open={isInUseDialogOpen}
        message={inUseMessage}
        onOpenChange={setIsInUseDialogOpen}
        resourceName="Categoría"
        isPending={isDeactivating}
        onDeactivate={handleConfirmDeactivate}
      />
    </>
  )
}