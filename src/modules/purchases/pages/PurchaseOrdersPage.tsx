import { useState } from "react"
import { Link } from "react-router"
import { ArrowUpRight, ClipboardList } from "lucide-react"
import { useHasPermission } from "@/modules/auth"
import { useSupplierOptions } from "@/modules/maintenance"
import type { Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { EntityPickerDialog } from "@/shared/components/EntityPickerDialog"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { purchaseOrderHooks } from "../hooks"
import { purchaseOrderService } from "../service"
import { purchaseOrdersToCsv } from "../orders/csv"
import {
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_TONES,
  type PurchaseOrder,
} from "../orders/schema"

export default function PurchaseOrdersPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState("")
  const [exportMessage, setExportMessage] = useState("")
  const [supplierSearchInput, setSupplierSearchInput] = useState("")
  const supplierSearch = useDebouncedValue(supplierSearchInput.trim(), 300)
  const list = useListFilters(["status", "supplier_id"] as const)
  const orders = purchaseOrderHooks.useList(list.params)
  const suppliers = useSupplierOptions({ includeInactive: true, search: supplierSearch })
  const canCreate = useHasPermission("purchases.orders:create")
  const canViewReceptions = useHasPermission("purchases.receptions:view")

  const exportOrders = async () => {
    setIsExporting(true)
    setExportError("")
    setExportMessage("")

    try {
      const firstPage = await purchaseOrderService.list({ ...list.params, page: 1, size: 100 })
      const allOrders = [...firstPage.items]
      for (let page = 2; page <= firstPage.pages; page += 1) {
        const result = await purchaseOrderService.list({ ...list.params, page, size: 100 })
        allOrders.push(...result.items)
      }

      const blob = new Blob([purchaseOrdersToCsv(allOrders)], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "ordenes-de-compra.csv"
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setExportMessage(`Se exportaron ${allOrders.length} órdenes de compra.`)
    } catch (error) {
      setExportError(getErrorMessage(error))
    } finally {
      setIsExporting(false)
    }
  }

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "number",
      header: "Número",
      cell: (row) => <span className="inline-flex rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs">{row.number}</span>,
    },
    { key: "supplier", header: "Proveedor", cell: (row) => <span className="font-medium">{row.supplier_name}</span> },
    { key: "expected", header: "Entrega esperada", cell: (row) => formatBusinessDate(row.expected_date) },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      cell: (row) => <span className="font-mono text-sm font-semibold">{formatMoney(row.total)}</span>,
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={PURCHASE_ORDER_STATUS_TONES[row.status]} label={PURCHASE_ORDER_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <Link to={`/purchases/orders/${row.id}`}>
            Ver
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </Button>
      ),
    },
  ]

  const actions = (
    <div className="flex flex-wrap gap-2">
      {canViewReceptions && (
        <Button variant="outline" asChild>
          <Link to="/purchases/receptions">Ver recepciones</Link>
        </Button>
      )}
      <Button variant="outline" onClick={() => void exportOrders()} disabled={isExporting || orders.isPending}>
        {isExporting ? "Exportando..." : "Exportar CSV"}
      </Button>
      {canCreate && (
        <Button asChild>
          <Link to="/purchases/orders/new">Nueva orden</Link>
        </Button>
      )}
    </div>
  )

  return (
    <ListPageLayout
      title="Órdenes de compra"
      description="Lo pactado con el proveedor. Las recepciones registran lo que llega."
      actions={actions}
      query={orders}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{
        title: "Aún no hay órdenes de compra",
        description: "Crea una orden o parte de una solicitud aprobada.",
        action: canCreate && (
          <Button asChild>
            <Link to="/purchases/orders/new">Nueva orden</Link>
          </Button>
        ),
      }}
      toolbar={
        <>
          <div className="flex basis-full items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <ClipboardList aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Seguimiento de compras</p>
                <p className="text-xs text-muted-foreground">Órdenes emitidas y pendientes de recepción</p>
              </div>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {orders.data?.total ?? 0} resultados
            </span>
          </div>
          {exportError && <p role="alert" className="w-full text-sm text-danger-text">{exportError}</p>}
          {exportMessage && <p role="status" className="w-full text-sm text-muted-foreground">{exportMessage}</p>}
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por número o proveedor"
            aria-label="Buscar órdenes de compra"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por estado"
            value={list.values.status}
            onChange={list.setFilter("status")}
            allLabel="Todos los estados"
            options={PURCHASE_ORDER_STATUSES.map((value) => ({ value, label: PURCHASE_ORDER_STATUS_LABELS[value] }))}
          />
          <EntityPickerDialog
            aria-label="Filtrar por proveedor"
            value={list.values.supplier_id}
            onValueChange={list.setFilter("supplier_id")}
            onSearchChange={setSupplierSearchInput}
            isLoading={suppliers.isFetching}
            errorMessage={suppliers.isError ? getErrorMessage(suppliers.error) : undefined}
            searchPlaceholder="Buscar por nombre o documento"
            placeholder="Todos los proveedores"
            allOption={{ value: "all", label: "Todos los proveedores" }}
            options={(suppliers.data ?? []).map((supplier) => ({
              value: supplier.id,
              label: `${supplier.name} · ${supplier.document_number}`,
            }))}
            disabled={suppliers.isPending}
            className="w-64"
          />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
