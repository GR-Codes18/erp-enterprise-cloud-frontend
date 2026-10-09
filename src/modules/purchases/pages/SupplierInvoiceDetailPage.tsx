import { useState } from "react"
import { Link, useParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { DocumentsPanel } from "@/modules/documents"
import { useDocumentPayments } from "@/modules/finance"
import { DetailGrid } from "@/shared/components/DetailGrid"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import ReasonDialog from "@/shared/components/ReasonDialog"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate } from "@/shared/lib/dates"
import { formatMoney, toCents } from "@/shared/lib/money"
import { supplierInvoiceHooks } from "../hooks"
import {
  SUPPLIER_INVOICE_STATUS_LABELS,
  SUPPLIER_INVOICE_STATUS_TONES,
  canTransitionSupplierInvoice,
  supplierInvoiceCode,
} from "../invoices/schema"

export default function SupplierInvoiceDetailPage() {
  const { id = "" } = useParams()
  const invoice = supplierInvoiceHooks.useDetail(id)
  const voidInvoice = supplierInvoiceHooks.useAction("void")
  const canVoid = useHasPermission("purchases.invoices:void")
  const canSeeFinance = useHasPermission("finance.payments:view")
  const payments = useDocumentPayments(id, { enabled: canSeeFinance })
  const canAttach = useHasPermission("documents.files:create")
  const [voidOpen, setVoidOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (invoice.isPending) return <p role="status">Cargando factura…</p>
  if (invoice.isError) return <ErrorState message={getErrorMessage(invoice.error)} onRetry={() => void invoice.refetch()} />

  const document = invoice.data
  const code = supplierInvoiceCode(document)
  const voidable = canTransitionSupplierInvoice(document.status, "void") && toCents(document.paid) === 0

  const actions = (
    <>
      {canVoid && voidable && (
        <Button variant="destructive" onClick={() => setVoidOpen(true)}>
          Anular factura
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/purchases/invoices">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={`Factura ${code}`} description={document.supplier_name} actions={actions} />

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}
      {/* El aviso lo calcula el backend: el frontend lo muestra tal cual */}
      {document.warning && document.status !== "void" && (
        <p role="status" className="mb-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text">
          {document.warning}
        </p>
      )}
      {document.status === "void" && document.void_reason && (
        <p className="mb-4 rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">Motivo de la anulación:</span> {document.void_reason}
        </p>
      )}

      <DetailGrid
        items={[
          {
            label: "Estado",
            value: <StatusBadge tone={SUPPLIER_INVOICE_STATUS_TONES[document.status]} label={SUPPLIER_INVOICE_STATUS_LABELS[document.status]} />,
          },
          {
            label: "Orden de compra",
            value: (
              <Link className="underline" to={`/purchases/orders/${document.order_id}`}>
                {document.order_number}
              </Link>
            ),
          },
          { label: "Emisión", value: formatBusinessDate(document.issue_date) },
          { label: "Vencimiento", value: formatBusinessDate(document.due_date) },
          { label: "Total de la factura", value: formatMoney(document.total) },
          { label: "Valor de lo recibido", value: formatMoney(document.received_total) },
          { label: "Pagado", value: formatMoney(document.paid) },
          { label: "Saldo", value: formatMoney(document.balance) },
        ]}
      />

      {/* Los pagos se ven en lectura; se registran en Finanzas */}
      <section className="space-y-3 rounded-md border p-4" aria-labelledby="payments-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="payments-title" className="text-base font-medium">
            Pagos
          </h2>
          {canSeeFinance && (
            <Button variant="link" size="sm" asChild>
              <Link to={`/finance/payments?document_id=${document.id}`}>Ver en Finanzas</Link>
            </Button>
          )}
        </div>
        {!canSeeFinance ? (
          <p className="text-sm text-muted-foreground">No tienes permiso para ver los pagos.</p>
        ) : payments.isError ? (
          <ErrorState message={getErrorMessage(payments.error)} onRetry={() => void payments.refetch()} />
        ) : payments.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando pagos…
          </p>
        ) : payments.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esta factura aún no tiene pagos registrados.</p>
        ) : (
          <ul className="divide-y rounded-md border">
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
        <DocumentsPanel entity={{ type: "purchase", id: document.id, label: `la factura ${code}` }} canUpload={canAttach} />
      </div>

      <ReasonDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Anular factura"
        description="Solo se anula una factura sin pagos. Indica el motivo."
        confirmLabel="Anular factura"
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
