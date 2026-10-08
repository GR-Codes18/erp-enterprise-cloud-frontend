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
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { formatMoney } from "@/shared/lib/money"
import { ProductFormDialog } from "../products/components/ProductFormDialog"
import { useDeleteProduct, usePatchProduct, useProducts } from "../products/hooks"
import { STATUS_LABELS, type Product } from "../products/schema"

const PAGE_SIZE = 10

export default function ProductsPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)

  const [dialog, setDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  })
  const [toDelete, setToDelete] = useState<Product | null>(null)
  const [inUseProduct, setInUseProduct] = useState<Product | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const products = useProducts({ page, size: PAGE_SIZE, search })
  const deleteProduct = useDeleteProduct()
  const patchProduct = usePatchProduct()

  const handleConfirmDelete = () => {
    if (!toDelete) return
    const target = toDelete
    deleteProduct.mutate(target.id, {
      onSuccess: () => {
        if ((products.data?.items.length ?? 0) === 1 && page > 1) setPage(page - 1)
        setToDelete(null)
      },
      onError: (error) => {
        setToDelete(null)
        if (isApiError(error) && error.status === 409) {
          setInUseProduct(target)
        } else {
          setActionError(getErrorMessage(error))
        }
      },
    })
  }

  const handleConfirmDeactivate = () => {
    if (!inUseProduct) return
    patchProduct.mutate(
      { id: inUseProduct.id, input: { status: "inactive" } },
      {
        onSuccess: () => {
          setInUseProduct(null)
        },
        onError: (error) => {
          setInUseProduct(null)
          setActionError(getErrorMessage(error))
        },
      }
    )
  }

  const columns: Column<Product>[] = [
    {
      key: "code",
      header: "Código",
      className: "w-32",
      cell: (row) => <span className="font-mono text-sm font-medium">{row.code}</span>,
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
      key: "unit_price",
      header: "Precio",
      className: "text-right",
      cell: (row) => <span className="font-mono">{formatMoney(String(row.unit_price))}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      className: "text-right w-24",
      cell: (row) => (
        <span className={`font-mono ${row.stock === 0 ? "font-bold text-danger-text" : ""}`}>
          {row.stock}
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
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${row.name}`}
            onClick={() => setDialog({ open: true, product: row })}
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

  const newProductButton = (
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

      <div className="mb-4 max-w-sm">
        <Input
          type="search"
          placeholder="Buscar por código o nombre..."
          aria-label="Buscar productos"
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
              search ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún producto coincide con tu búsqueda."
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
        isLoading={deleteProduct.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Modal 2: Respuesta 409 Conflict (Producto en uso) -> Desactivar */}
      <ConfirmDialog
        open={inUseProduct !== null}
        onOpenChange={(open) => {
          if (!open) setInUseProduct(null)
        }}
        title="Producto en uso"
        description="Este producto tiene movimientos y no se puede eliminar. Puedes desactivarlo para que deje de usarse en nuevas operaciones."
        confirmText="Desactivar"
        isLoading={patchProduct.isPending}
        onConfirm={handleConfirmDeactivate}
      />
    </>
  )
}