import { useState } from "react"
import { useCategoryOptions, useWarehouseOptions } from "@/modules/maintenance"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import type { PageParams } from "@/shared/lib/api/types"
import { useStock } from "../stock/hooks"
import {
  FILTER_ALL,
  STATUS_LABELS,
  STATUS_TONES,
  STOCK_STATUSES,
  buildStockFilters,
  type StockRow,
} from "../stock/schema"

const PAGE_SIZE = 10

export default function StockPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState(FILTER_ALL)
  const [warehouseId, setWarehouseId] = useState(FILTER_ALL)
  const [categoryId, setCategoryId] = useState(FILTER_ALL)

  // Opciones publicadas por Mantenimiento (regla 0.5)
  const warehouses = useWarehouseOptions()
  const categories = useCategoryOptions()

  const filters = buildStockFilters({
    status,
    warehouse_id: warehouseId,
    category_id: categoryId,
  })
  const params: PageParams = { page, size: PAGE_SIZE, search, filters }
  const stock = useStock(params)

  const hasFilters = search !== "" || Object.keys(filters).length > 0

  // Cada cambio de filtro vuelve a la página 1
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput("")
    setStatus(FILTER_ALL)
    setWarehouseId(FILTER_ALL)
    setCategoryId(FILTER_ALL)
    setPage(1)
  }

  const columns: Column<StockRow>[] = [
    { key: "code", header: "Código", cell: (row) => row.product_code },
    { key: "product", header: "Producto", cell: (row) => <span className="font-medium">{row.product_name}</span> },
    { key: "category", header: "Categoría", cell: (row) => row.category_name },
    { key: "warehouse", header: "Almacén", cell: (row) => row.warehouse_name },
    {
      key: "quantity",
      header: "Disponible",
      className: "text-right",
      cell: (row) => `${row.quantity} ${row.unit}`,
    },
    { key: "min_stock", header: "Mínimo", className: "text-right", cell: (row) => row.min_stock },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={STATUS_TONES[row.status]} label={STATUS_LABELS[row.status]} />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Stock"
        description="Existencias por producto y almacén. Solo lectura: el stock cambia únicamente por movimientos."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-sm">
          <Input
            type="search"
            placeholder="Buscar por producto o código"
            aria-label="Buscar en el stock"
            value={searchInput}
            onChange={(event) => withReset(setSearchInput)(event.target.value)}
          />
        </div>

        <Select value={warehouseId} onValueChange={withReset(setWarehouseId)}>
          <SelectTrigger className="w-60" aria-label="Filtrar por almacén">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todos los almacenes</SelectItem>
            {(warehouses.data ?? []).map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryId} onValueChange={withReset(setCategoryId)}>
          <SelectTrigger className="w-60" aria-label="Filtrar por categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todas las categorías</SelectItem>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={withReset(setStatus)}>
          <SelectTrigger className="w-48" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todos los estados</SelectItem>
            {STOCK_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {stock.isError ? (
        <ErrorState message={getErrorMessage(stock.error)} onRetry={() => void stock.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={stock.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={stock.isPending}
            empty={
              hasFilters ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ninguna existencia coincide con tu búsqueda o filtros."
                />
              ) : (
                <EmptyState
                  title="Aún no hay existencias"
                  description="El stock aparece cuando se registran movimientos de inventario."
                />
              )
            }
          />
          <Pagination
            page={stock.data?.page ?? 1}
            pages={stock.data?.pages ?? 1}
            total={stock.data?.total ?? 0}
            disabled={stock.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}