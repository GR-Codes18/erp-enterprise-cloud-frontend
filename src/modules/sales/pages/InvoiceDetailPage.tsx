import { useState } from "react"
import { Link, useParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { DocumentsPanel } from "@/modules/documents"
import { useDocumentPayments } from "@/modules/finance"
import { DetailGrid } from "@/shared/components/DetailGrid"
import { DocumentLinesTable } from "@/shared/components/DocumentLinesTable"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import ReasonDialog from "@/shared/components/ReasonDialog"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { TotalsSummary } from "@/shared/components/TotalsSummary"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { useInvoice, useVoidInvoice } from "../hooks"
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  INVOICE_TYPE_LABELS,
  canVoidInvoice,
  invoiceCode,
} from "../invoices/schema"

export default function InvoiceDetailPage() {
  const { id = "" } = useParams()
  const invoice = useInvoice(id)
  const voidInvoice = useVoidInvoice()
  const canVoid = useHasPermission("sales.invoices:void")
  const canReturn = useHasPermission("sales.returns:create")
  const canSeeFinance = useHasPermission("finance.payments:view")
  const canAttach = useHasPermission("documents.files:create")
  const payments = useDocumentPayments(id, { enabled: canSeeFinance })
  const [voidOpen, setVoidOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (invoice.isPending) return <p role="status">Cargando comprobante…</p>
  if (invoice.isError) return <ErrorState message={getErrorMessage(invoice.error)} onRetry={() => void invoice.refetch()} />

  const document = invoice.data
  const code = invoiceCode(document)
  const isVoid = document.status === "void"
  const hasReturnable = document.items.some((line) => line.quantity > line.returned_quantity)

  const actions = (
    <>
      {canReturn && !isVoid && hasReturnable && (
        <Button variant="outline" asChild>
          <Link to={`/sales/returns/new?invoice=${document.id}`}>Registrar devolución</Link>
        </Button>
      )}
      {canVoid && canVoidInvoice(document) && (
        <Button variant="destructive" onClick={() => setVoidOpen(true)}>
          Anular comprobante
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/sales/invoices">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={`${INVOICE_TYPE_LABELS[document.type]} ${code}`} description={document.customer_name} actions={actions} />

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}
      {isVoid && document.void_reason && (
        <p className="mb-4 rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">Motivo de la anulación:</span> {document.void_reason}
        </p>
      )}

      <DetailGrid
        items={[
          { label: "Estado", value: <StatusBadge tone={INVOICE_STATUS_TONES[document.status]} label={INVOICE_STATUS_LABELS[document.status]} /> },
          { label: "Cliente", value: `${document.customer_name} · ${document.customer_document}` },
          { label: "Emisión", value: formatBusinessDate(document.issue_date) },
          {
            label: "Vencimiento",
            value: document.payment_condition === "credit" ? formatBusinessDate(document.due_date) : "Al contado",
          },
          {
            label: "Orden de venta",
            value: <Link className="underline" to={`/sales/orders/${document.order_id}`}>{document.order_number}</Link>,
          },
          { label: "Total", value: formatMoney(document.total) },
          { label: "Cobrado", value: formatMoney(document.paid) },
          { label: "Saldo", value: formatMoney(document.balance) },
        ]}
      />

      <section className="mt-6 space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5" aria-labelledby="invoice-lines-title">
        <div>
          <h2 id="invoice-lines-title" className="text-base font-semibold">Productos</h2>
          <p className="text-sm text-muted-foreground">Cantidades, precios, devoluciones y subtotales del comprobante.</p>
        </div>
        <DocumentLinesTable
          lines={document.items}
          extraColumn={{ header: "Devuelto", cell: (line) => line.returned_quantity }}
        />
        <TotalsSummary official={document} />
      </section>

      <section className="mt-6 space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5" aria-labelledby="invoice-payments-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="invoice-payments-title" className="text-base font-semibold">Cobros</h2>
            <p className="text-sm text-muted-foreground">Pagos registrados para este comprobante.</p>
          </div>
          {canSeeFinance && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/finance/payments?document_id=${document.id}`}>Ver en Finanzas</Link>
            </Button>
          )}
        </div>
        {!canSeeFinance ? (
          <p className="text-sm text-muted-foreground">No tienes permiso para ver los cobros.</p>
        ) : payments.isError ? (
          <ErrorState message={getErrorMessage(payments.error)} onRetry={() => void payments.refetch()} />
        ) : payments.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">Cargando cobros…</p>
        ) : payments.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este comprobante aún no tiene cobros registrados.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {payments.data.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-mono">{payment.number}</span> · {formatBusinessDate(payment.payment_date)}
                  {payment.status === "void" && (
                    <span className="ml-2">
                      <StatusBadge tone="danger" label="Anulado" />
                    </span>
                  )}
                </span>
                <span className="font-mono">{formatMoney(payment.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6">
        <DocumentsPanel entity={{ type: "sale", id: document.id, label: `el comprobante ${code}` }} canUpload={canAttach} />
      </div>

      <ReasonDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Anular comprobante"
        description="Solo se anula un comprobante sin cobros. El sistema revertirá el stock. Indica el motivo."
        confirmLabel="Anular comprobante"
        isPending={voidInvoice.isPending}
        onConfirm={(reason) => {
          setActionError(null)
          voidInvoice.mutate(
            { id: document.id, reason },
            {
              onSuccess: () => setVoidOpen(false),
              onError: (error) => {
                setVoidOpen(false)
                setActionError(getErrorMessage(error))
              },
            },
          )
        }}
      />
    </>
  )
}
