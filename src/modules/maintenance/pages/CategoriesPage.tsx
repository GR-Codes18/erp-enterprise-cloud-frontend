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
import { CategoryFormDialog } from "../categories/components/CategoryFormDialog"
import { useCategories, useDeleteCategory } from "../categories/hooks"
import { STATUS_LABELS, type Category } from "../categories/schema"

const PAGE_SIZE = 10

export default function CategoriesPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  })
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const categories = useCategories({ page, size: PAGE_SIZE, search })
  const deleteCategory = useDeleteCategory()

  const handleConfirmDelete = () => {
    if (!toDelete) return
    deleteCategory.mutate(toDelete.id, {
      onSuccess: () => {
        if ((categories.data?.items.length ?? 0) === 1 && page > 1) setPage(page - 1)
        setToDelete(null)
      },
      onError: (error) => {
        setToDelete(null)
        setActionError(getErrorMessage(error))
      },
    })
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
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${row.name}`}
            onClick={() => setDialog({ open: true, category: row })}
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

  const newCategoryButton = (
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

      <div className="mb-4 max-w-sm">
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
              search ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ninguna categoría coincide con tu búsqueda."
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
        isLoading={deleteCategory.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}