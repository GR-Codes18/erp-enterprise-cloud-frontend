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
import { formatMoney } from "@/shared/lib/money"
import { ProductFormDialog } from "@/modules/maintenance/products/components/ProductFormDialog"
import { useDeleteProduct, usePatchProduct, useProducts } from "@/modules/maintenance/products/hooks"
import { PRODUCT_STATUSES, STATUS_LABELS, type Product } from "@/modules/maintenance/products/schema"

const PAGE_SIZE = 10

export default function ProductsPage() {
  const [page, setPage] = useState(1)
  // Regla 1: el frontend oculta lo que no se permite (el backend vuelve a validar)
  const canCreate = useHasPermission("maintenance.products:create")
  const canEdit = useHasPermission("maintenance.products:edit")
  const canVoid = useHasPermission("maintenance.products:void")
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState(FILTER_ALL)
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  })
  const [toDelete, setToDelete] = useState<Product | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const products = useProducts({ page, size: PAGE_SIZE, search, filters: pickFilters({ status }) })
  const deleteProduct = useDeleteProduct()
  const patchProduct = usePatchProduct()

  const {
    isInUseDialogOpen,
    inUseMessage,
    setIsInUseDialogOpen,
    isDeleting,
    isDeactivating,
    handleDelete,
    handleConfirmDeactivate,
  } = useDeleteOrDeactivate<Product>({
    resourceName: "Producto",
    onDelete: async (item) => {
      await deleteProduct.mutateAsync(item.id)
      if ((products.data?.items.length ?? 0) === 1 && page > 1) {
        setPage(page - 1)
      }
    },
    onDeactivate: async (item) => {
      await patchProduct.mutateAsync({ id: item.id, input: { status: "inactive" } })
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

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: "SKU",
      className: "w-32",
      cell: (row) => <span className="font-mono text-sm font-medium">{row.sku}</span>,
    },
    {
      key: "name",
      header: "Nombre del Producto",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "category_name",
      header: "Categoría",
      cell: (row) => <span className="text-muted-foreground">{row.category_name || "—"}</span>,
    },
    {
      key: "sale_price",
      header: "Precio de venta",
      className: "text-right",
      cell: (row) => <span className="font-mono">{formatMoney(row.sale_price)}</span>,
    },
    {
      key: "cost_price",
      header: "Costo",
      className: "text-right",
      cell: (row) => <span className="font-mono text-muted-foreground">{formatMoney(row.cost_price)}</span>,
    },
    {
      key: "stock_total",
      header: "Stock total",
      className: "text-right w-32",
      // Lo calcula el backend (suma de almacenes). Sin stock se dice con texto, no solo con color
      cell: (row) =>
        row.stock_total === 0 ? (
          <StatusBadge tone="danger" label="Sin stock" />
        ) : (
          <span className="font-mono">
            {row.stock_total} {row.unit}
          </span>
        ),
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
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${row.name}`}
              onClick={() => setDialog({ open: true, product: row })}
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

  const newProductButton = canCreate && (
    <Button onClick={() => setDialog({ open: true, product: null })}>
      <Plus aria-hidden="true" />
      Nuevo producto
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Productos"
        description="Administra el catálogo de productos, sus categorías, precios y existencias."
        actions={newProductButton}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-sm">
          <Input
            type="search"
            placeholder="Buscar por SKU o nombre..."
            aria-label="Buscar productos"
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
          options={PRODUCT_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      {products.isError ? (
        <ErrorState
          message={getErrorMessage(products.error)}
          onRetry={() => void products.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={products.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={products.isPending}
            empty={
              search || status !== FILTER_ALL ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún producto coincide con tu búsqueda o filtro."
                />
              ) : (
                <EmptyState
                  title="Aún no hay productos"
                  description="Crea el primero para empezar a poblar el catálogo."
                  action={newProductButton}
                />
              )
            }
          />
          <Pagination
            page={products.data?.page ?? 1}
            pages={products.data?.pages ?? 1}
            total={products.data?.total ?? 0}
            disabled={products.isFetching}
            onPageChange={setPage}
          />
        </>
      )}

      <ProductFormDialog
        open={dialog.open}
        product={dialog.product}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />

      {/* Modal 1: Intentar eliminar */}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Eliminar producto"
        description={`¿Seguro que quieres eliminar el producto "${toDelete?.name ?? ""}"? Esta acción no se puede deshacer.`}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* Modal 2: Respuesta 409 Conflict (Producto en uso) -> Desactivar */}
      <InUseDialog
        open={isInUseDialogOpen}
        message={inUseMessage}
        onOpenChange={setIsInUseDialogOpen}
        resourceName="Producto"
        isPending={isDeactivating}
        onDeactivate={handleConfirmDeactivate}
      />
    </>
  )
}