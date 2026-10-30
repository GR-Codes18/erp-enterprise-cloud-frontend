import { useState } from "react"
import { useSearchParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { useMasterCatalog } from "@/modules/maintenance"
import type { Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import ReasonDialog from "@/shared/components/ReasonDialog"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate } from "@/shared/lib/dates"
import { FILTER_ALL } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import { PaymentFormDialog } from "../components/PaymentFormDialog"
import { useApprovePayment, useExecutePayment, usePayments, useVoidPayment } from "../hooks"
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  PAYMENT_TYPE_LABELS,
  canTransitionPayment,
  type Payment,
  type PaymentType,
} from "../payments/schema"

export function PaymentsPage({ type }: { type: PaymentType }) {
  const [searchParams] = useSearchParams()
  // "Ver en Finanzas" desde un comprobante o factura llega con ?document_id=
  const list = useListFilters(["method", "status", "document_id"] as const, {
    initial: { document_id: searchParams.get("document_id") ?? FILTER_ALL },
  })
  const payments = usePayments({ ...list.params, filters: { ...list.params.filters, type } })
  const paymentMethods = useMasterCatalog("payment-methods", { page: 1, size: 100 })
  const approvePayment = useApprovePayment()
  const executePayment = useExecutePayment()
  const voidPayment = useVoidPayment()
  const permission = type === "collection" ? "finance.collections" : "finance.payments"
  const canCreate = useHasPermission(`${permission}:create`)
  const canApprove = useHasPermission(`${permission}:approve`)
  const canExecute = useHasPermission(`${permission}:execute`)
  const canVoid = useHasPermission(`${permission}:void`)
  const [createOpen, setCreateOpen] = useState(false)
  const [toVoid, setToVoid] = useState<Payment | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const columns: Column<Payment>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "date", header: "Fecha", cell: (row) => formatBusinessDate(row.payment_date) },
    { key: "party", header: "Cliente / proveedor", cell: (row) => <span className="font-medium">{row.party_name}</span> },
    {
      key: "document",
      header: "Aplicaciones",
      cell: (row) => (
        <span className="font-mono text-sm">
          {row.applications.length === 1 ? row.document_code : `${row.applications.length} documentos`}
        </span>
      ),
    },
    {
      key: "method",
      header: "Medio",
      cell: (row) => {
        const label = paymentMethods.data?.items.find((item) => item.value === row.method)?.name ?? PAYMENT_METHOD_LABELS[row.method]
        return row.method === "transfer" ? `${label} · op. ${row.operation_number}` : label
      },
    },
    { key: "amount", header: "Monto", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.amount)}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={PAYMENT_STATUS_TONES[row.status]} label={PAYMENT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "actions",
      header: "Acciones",
      // Un pago no se edita: se anula con motivo y el saldo del documento se restituye
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {canApprove && canTransitionPayment(row.status, "approved") && (
            <Button
              variant="outline"
              size="sm"
              disabled={approvePayment.isPending}
              onClick={() => {
                setActionError(null)
                approvePayment.mutate(row.id, { onError: (error) => setActionError(getErrorMessage(error)) })
              }}
            >
              Aprobar
            </Button>
          )}
          {canExecute && canTransitionPayment(row.status, "executed") && (
            <Button
              size="sm"
              disabled={executePayment.isPending}
              onClick={() => {
                setActionError(null)
                executePayment.mutate(row.id, { onError: (error) => setActionError(getErrorMessage(error)) })
              }}
            >
              Ejecutar
            </Button>
          )}
          {canVoid && canTransitionPayment(row.status, "void") && (
            <Button variant="ghost" size="sm" onClick={() => setToVoid(row)}>
              Anular
            </Button>
          )}
        </div>
      ),
    },
  ]

  const title = type === "collection" ? "Cobros a clientes" : "Pagos a proveedores"
  const actions = canCreate && <Button onClick={() => setCreateOpen(true)}>Registrar {PAYMENT_TYPE_LABELS[type].toLowerCase()}</Button>

  return (
    <>
      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}
      {paymentMethods.isError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          No se pudo cargar el catálogo de formas de pago: {getErrorMessage(paymentMethods.error)}
        </p>
      )}
      <ListPageLayout
        title={title}
        description="Cada operación sigue registro, aprobación y ejecución. El saldo del documento cambia al ejecutarse; efectivo pasa por caja y transferencias por bancos."
        actions={actions}
        query={payments}
        columns={columns}
        getRowKey={(row) => row.id}
        hasFilters={list.hasFilters}
        onClearFilters={list.clear}
        onPageChange={list.setPage}
        empty={{ title: "Aún no hay cobros ni pagos", description: "Regístralos desde aquí o desde las cuentas por cobrar y pagar." }}
        toolbar={
          <>
            <Input
              type="search"
              className="max-w-xs"
              placeholder="Buscar por número, tercero, documento u operación"
              aria-label="Buscar cobros y pagos"
              value={list.searchInput}
              onChange={(event) => list.setSearchInput(event.target.value)}
            />
            <FilterSelect
              label="Filtrar por medio de pago"
              value={list.values.method}
              onChange={list.setFilter("method")}
              allLabel="Todos los medios"
              options={PAYMENT_METHODS.map((value) => ({
                value,
                label: paymentMethods.data?.items.find((item) => item.value === value)?.name ?? PAYMENT_METHOD_LABELS[value],
              }))}
              className="w-44"
            />
            <FilterSelect
              label="Filtrar por estado"
              value={list.values.status}
              onChange={list.setFilter("status")}
              allLabel="Todos los estados"
              options={PAYMENT_STATUSES.map((value) => ({ value, label: PAYMENT_STATUS_LABELS[value] }))}
              className="w-40"
            />
            {list.values.document_id !== FILTER_ALL && (
              <Button variant="secondary" onClick={() => list.setFilter("document_id")(FILTER_ALL)}>
                Quitar filtro de documento
              </Button>
            )}
            <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
          </>
        }
      />

      <PaymentFormDialog open={createOpen} onOpenChange={setCreateOpen} type={type} />
      <ReasonDialog
        open={toVoid !== null}
        onOpenChange={(open) => !open && setToVoid(null)}
        title={`Anular ${toVoid?.number ?? ""}`}
        description="Si ya se ejecutó, se revertirá el saldo y el movimiento financiero. Indica el motivo."
        confirmLabel="Anular"
        isPending={voidPayment.isPending}
        onConfirm={(reason) => {
          if (!toVoid) return
          setActionError(null)
          voidPayment.mutate(
            { id: toVoid.id, reason },
            {
              onSuccess: () => setToVoid(null),
              onError: (error) => {
                setToVoid(null)
                setActionError(getErrorMessage(error))
              },
            },
          )
        }}
      />
    </>
  )
}

export default function SupplierPaymentsPage() {
  return <PaymentsPage type="payment" />
}
