import { useState } from "react"
import { useSearchParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
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
import { usePayments, useVoidPayment } from "../hooks"
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  canTransitionPayment,
  type Payment,
  type PaymentType,
} from "../payments/schema"

export default function PaymentsPage() {
  const [searchParams] = useSearchParams()
  // "Ver en Finanzas" desde un comprobante o factura llega con ?document_id=
  const list = useListFilters(["type", "method", "status", "document_id"] as const, {
    initial: { document_id: searchParams.get("document_id") ?? FILTER_ALL },
  })
  const payments = usePayments(list.params)
  const voidPayment = useVoidPayment()
  const canCreate = useHasPermission("finance.payments:create")
  const canVoid = useHasPermission("finance.payments:void")
  const [newType, setNewType] = useState<PaymentType | null>(null)
  const [toVoid, setToVoid] = useState<Payment | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const columns: Column<Payment>[] = [
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "date", header: "Fecha", cell: (row) => formatBusinessDate(row.payment_date) },
    { key: "type", header: "Tipo", cell: (row) => PAYMENT_TYPE_LABELS[row.type] },
    { key: "party", header: "Cliente / proveedor", cell: (row) => <span className="font-medium">{row.party_name}</span> },
    { key: "document", header: "Documento", cell: (row) => <span className="font-mono text-sm">{row.document_code}</span> },
    {
      key: "method",
      header: "Medio",
      cell: (row) => (row.method === "transfer" ? `${PAYMENT_METHOD_LABELS.transfer} · op. ${row.operation_number}` : PAYMENT_METHOD_LABELS[row.method]),
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
      cell: (row) =>
        canVoid && canTransitionPayment(row.status, "void") ? (
          <Button variant="ghost" size="sm" onClick={() => setToVoid(row)}>
            Anular
          </Button>
        ) : null,
    },
  ]

  const actions = canCreate && (
    <>
      <Button onClick={() => setNewType("collection")}>Registrar cobro</Button>
      <Button variant="outline" onClick={() => setNewType("payment")}>
        Registrar pago
      </Button>
    </>
  )

  return (
    <>
      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}
      <ListPageLayout
        title="Cobros y pagos"
        description="Cada cobro o pago actualiza el saldo de su documento. Efectivo pasa por caja; transferencias, por bancos."
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
              label="Filtrar por tipo"
              value={list.values.type}
              onChange={list.setFilter("type")}
              allLabel="Cobros y pagos"
              options={PAYMENT_TYPES.map((value) => ({ value, label: PAYMENT_TYPE_LABELS[value] }))}
              className="w-40"
            />
            <FilterSelect
              label="Filtrar por medio de pago"
              value={list.values.method}
              onChange={list.setFilter("method")}
              allLabel="Todos los medios"
              options={PAYMENT_METHODS.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))}
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

      <PaymentFormDialog open={newType !== null} onOpenChange={(open) => !open && setNewType(null)} type={newType ?? "collection"} />
      <ReasonDialog
        open={toVoid !== null}
        onOpenChange={(open) => !open && setToVoid(null)}
        title={`Anular ${toVoid?.number ?? ""}`}
        description="El saldo del documento se restituye. Indica el motivo."
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
