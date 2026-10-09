import { useState } from "react"
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
import { formatDateTimeLima } from "@/shared/lib/dates"
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

export default function KardexPage() {
  const [page, setPage] = useState(1)
  // "" = todavía no eligió producto
  const [productId, setProductId] = useState("")
  const [warehouseId, setWarehouseId] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Opciones publicadas por Mantenimiento (regla 0.5): solo productos y almacenes activos
  const products = useProductOptions()
  const warehouses = useWarehouseOptions()

  const rangeValid = isValidDateRange(dateFrom, dateTo)
  const ready = isKardexQueryReady({ product_id: productId, date_from: dateFrom, date_to: dateTo })

  const params: PageParams = {
    page,
    size: PAGE_SIZE,
    filters: buildKardexFilters({ product_id: productId, warehouse_id: warehouseId }),
    date_from: dateFrom,
    date_to: dateTo,
  }
  const kardex = useKardex(params, ready)

  const hasSelection = productId !== "" || warehouseId !== FILTER_ALL || dateFrom !== "" || dateTo !== ""

  // Cada cambio de filtro vuelve a la página 1
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setProductId("")
    setWarehouseId(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: Column<KardexRow>[] = [
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
        title="Kardex"
        description="Historial de movimientos de un producto. Elige el producto y el rango de fechas para consultarlo."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field id="product_id" label="Producto">
          <Select value={productId} onValueChange={withReset(setProductId)}>
            <SelectTrigger id="product_id" className="w-80" aria-label="Producto">
              <SelectValue placeholder="Selecciona un producto" />
            </SelectTrigger>
            <SelectContent>
              {(products.data ?? []).map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.code} · {product.name}
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
            title="Elige un producto y un rango de fechas"
            description="El Kardex necesita un producto y las fechas «Desde» y «Hasta» para no traer todo el historial."
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