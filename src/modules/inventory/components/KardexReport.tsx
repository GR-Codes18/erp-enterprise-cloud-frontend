import { useState } from "react"
import { Link } from "react-router"
import { useProductOptions, useWarehouseOptions } from "@/modules/maintenance"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
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
import { getErrorMessage } from "@/shared/lib/api/errors"
import type { PageParams } from "@/shared/lib/api/types"
import { formatDateTimeLima, todayInLima } from "@/shared/lib/dates"
import { useKardex } from "../kardex/hooks"
import {
  FILTER_ALL,
  KARDEX_TYPE_LABELS,
  buildKardexFilters,
  isKardexQueryReady,
  isValidDateRange,
  type KardexRow,
} from "../kardex/schema"

const PAGE_SIZE = 10

export function KardexReport({ commercialOnly = false }: { commercialOnly?: boolean }) {
  const [today] = useState(todayInLima)
  const [page, setPage] = useState(1)
  const [productId, setProductId] = useState(commercialOnly ? FILTER_ALL : "")
  const [warehouseId, setWarehouseId] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState(commercialOnly ? today : "")
  const [dateTo, setDateTo] = useState(commercialOnly ? today : "")

  // Opciones publicadas por Mantenimiento (regla 0.5). El kardex es historia: también inactivos
  const products = useProductOptions({ includeInactive: true })
  const warehouses = useWarehouseOptions({ includeInactive: true })
  const productById = new Map((products.data ?? []).map((product) => [product.id, product]))

  const rangeValid = isValidDateRange(dateFrom, dateTo)
  const ready = isKardexQueryReady(
    { product_id: productId, date_from: dateFrom, date_to: dateTo },
    { requireProduct: !commercialOnly },
  )

  const params: PageParams = {
    page,
    size: PAGE_SIZE,
    filters: buildKardexFilters(
      { product_id: productId, warehouse_id: warehouseId },
      commercialOnly ? ["purchase", "sale"] : undefined,
    ),
    date_from: dateFrom,
    date_to: dateTo,
  }
  const kardex = useKardex(params, ready)

  const hasSelection =
    (productId !== "" && productId !== FILTER_ALL) ||
    warehouseId !== FILTER_ALL ||
    dateFrom !== (commercialOnly ? today : "") ||
    dateTo !== (commercialOnly ? today : "")

  // Cada cambio de filtro vuelve a la página 1
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setProductId(commercialOnly ? FILTER_ALL : "")
    setWarehouseId(FILTER_ALL)
    setDateFrom(commercialOnly ? today : "")
    setDateTo(commercialOnly ? today : "")
    setPage(1)
  }

  const columns: Column<KardexRow>[] = [
    {
      key: "product",
      header: "Producto",
      cell: (row) => {
        const product = productById.get(row.product_id)
        const name = row.product_name ?? product?.name
        return name ? (
          <span>
            <span className="block font-medium">{name}</span>
            {(row.product_sku || product?.sku) && (
              <span className="block text-xs text-muted-foreground">{row.product_sku ?? product?.sku}</span>
            )}
          </span>
        ) : (
          <span className="font-medium">{row.product_id}</span>
        )
      },
    },
    {
      key: "occurred_at",
      header: "Fecha y hora",
      cell: (row) => formatDateTimeLima(row.occurred_at),
    },
    {
      key: "type",
      header: "Tipo",
      cell: (row) => <StatusBadge tone="neutral" label={KARDEX_TYPE_LABELS[row.type]} />,
    },
    { key: "reference", header: "Documento", cell: (row) => row.reference || "—" },
    { key: "warehouse", header: "Almacén", cell: (row) => row.warehouse_name },
    {
      key: "quantity_in",
      header: "Entrada",
      className: "text-right",
      cell: (row) => (row.quantity_in > 0 ? row.quantity_in : "—"),
    },
    {
      key: "quantity_out",
      header: "Salida",
      className: "text-right",
      cell: (row) => (row.quantity_out > 0 ? row.quantity_out : "—"),
    },
    {
      key: "balance",
      header: "Saldo",
      className: "text-right",
      cell: (row) => <span className="font-medium">{row.balance}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title={commercialOnly ? "Kardex comercial" : "Kardex"}
        description={
          commercialOnly
            ? "Consulta las compras y ventas de hoy; puedes filtrar por producto, almacén o cambiar el rango de fechas."
            : "Historial completo de movimientos de un producto. Elige el producto y el rango de fechas para consultarlo."
        }
        actions={
          commercialOnly ? (
            <Button variant="outline" asChild>
              <Link to="/inventory/kardex">Ver kardex completo</Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/inventory/commercial-kardex">Ver kardex comercial</Link>
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Field id="product_id" label={commercialOnly ? "Producto (opcional)" : "Producto"}>
          <Select value={productId} onValueChange={withReset(setProductId)}>
            <SelectTrigger id="product_id" className="w-80" aria-label="Producto">
              <SelectValue placeholder={commercialOnly ? "Todos los productos" : "Selecciona un producto"} />
            </SelectTrigger>
            <SelectContent>
              {commercialOnly && <SelectItem value={FILTER_ALL}>Todos los productos</SelectItem>}
              {(products.data ?? []).map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.sku} · {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="warehouse_id" label="Almacén (opcional)">
          <Select value={warehouseId} onValueChange={withReset(setWarehouseId)}>
            <SelectTrigger id="warehouse_id" className="w-60" aria-label="Almacén">
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
        </Field>

        <Field id="date_from" label="Desde">
          <Input
            id="date_from"
            type="date"
            className="w-40"
            value={dateFrom}
            onChange={(event) => withReset(setDateFrom)(event.target.value)}
          />
        </Field>
        <Field
          id="date_to"
          label="Hasta"
          error={rangeValid ? undefined : "La fecha final no puede ser anterior a la inicial"}
        >
          <Input
            id="date_to"
            type="date"
            className="w-40"
            aria-invalid={!rangeValid}
            aria-describedby={rangeValid ? undefined : "date_to-error"}
            value={dateTo}
            onChange={(event) => withReset(setDateTo)(event.target.value)}
          />
        </Field>

        {hasSelection && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {!ready ? (
        <div className="rounded-md border">
          <EmptyState
            title={commercialOnly ? "Elige un rango de fechas válido" : "Elige un producto y un rango de fechas"}
            description={
              commercialOnly
                ? "Selecciona las fechas «Desde» y «Hasta» para consultar las compras y ventas del periodo."
                : "El Kardex necesita un producto y las fechas «Desde» y «Hasta» para no traer todo el historial."
            }
          />
        </div>
      ) : kardex.isError ? (
        <ErrorState message={getErrorMessage(kardex.error)} onRetry={() => void kardex.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={kardex.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={kardex.isPending}
            empty={
              <EmptyState
                title="Sin movimientos"
                description="Este producto no tiene movimientos en el rango de fechas elegido."
              />
            }
          />
          <Pagination
            page={kardex.data?.page ?? 1}
            pages={kardex.data?.pages ?? 1}
            total={kardex.data?.total ?? 0}
            disabled={kardex.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}