import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { DocumentsPanel } from "@/modules/documents"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DetailGrid } from "@/shared/components/DetailGrid"
import { DocumentLinesTable } from "@/shared/components/DocumentLinesTable"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import ReasonDialog from "@/shared/components/ReasonDialog"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { TotalsSummary } from "@/shared/components/TotalsSummary"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { IssueInvoiceDialog } from "../components/IssueInvoiceDialog"
import { useCancelOrder, useConfirmOrder, useDeleteOrder, useIssueInvoice, useOrder } from "../hooks"
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES, PAYMENT_CONDITION_LABELS, canTransitionOrder } from "../orders/schema"

type Action = "confirm" | "cancel" | "invoice" | "delete"

export default function OrderDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const order = useOrder(id)
  const confirm = useConfirmOrder()
  const cancel = useCancelOrder()
  const issue = useIssueInvoice()
  const remove = useDeleteOrder()
  const canEdit = useHasPermission("sales.orders:edit")
  const canApprove = useHasPermission("sales.orders:approve")
  const canVoid = useHasPermission("sales.orders:void")
  const canInvoice = useHasPermission("sales.invoices:create")
  const canAttach = useHasPermission("documents.files:create")
  const canSeeQuotes = useHasPermission("sales.quotes:view")
  const [dialog, setDialog] = useState<Action | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = confirm.isPending || cancel.isPending || issue.isPending || remove.isPending

  if (order.isPending) return <p role="status">Cargando pedido…</p>
  if (order.isError) return <ErrorState message={getErrorMessage(order.error)} onRetry={() => void order.refetch()} />

  const document = order.data
  const isDraft = document.status === "draft"
  const done = {
    onSuccess: () => setDialog(null),
    // Mensajes del backend tal cual (stock insuficiente, límite de crédito...)
    onError: (error: unknown) => {
      setDialog(null)
      setActionError(getErrorMessage(error))
    },
  }
  const run = (action: () => void) => {
    setActionError(null)
    action()
  }

  const actions = (
    <>
      {canApprove && canTransitionOrder(document.status, "confirmed") && (
        <Button disabled={isPending} onClick={() => setDialog("confirm")}>
          Confirmar pedido
        </Button>
      )}
      {canInvoice && canTransitionOrder(document.status, "invoiced") && (
        <Button disabled={isPending} onClick={() => setDialog("invoice")}>
          Emitir comprobante
        </Button>
      )}
      {document.invoice_id && (
        <Button variant="outline" asChild>
          <Link to={`/sales/invoices/${document.invoice_id}`}>Ver comprobante</Link>
        </Button>
      )}
      {canEdit && isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/sales/orders/${document.id}/edit`}>Editar borrador</Link>
        </Button>
      )}
      {canVoid && canTransitionOrder(document.status, "cancelled") && (
        <Button variant="destructive" disabled={isPending} onClick={() => setDialog("cancel")}>
          Cancelar pedido
        </Button>
      )}
      {canVoid && isDraft && (
        <Button variant="ghost" disabled={isPending} onClick={() => setDialog("delete")}>
          Eliminar borrador
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/sales/orders">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={`Pedido ${document.number}`} description={`Registrado ${formatDateTimeLima(document.created_at)}`} actions={actions} />

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      <DetailGrid
        items={[
          { label: "Estado", value: <StatusBadge tone={ORDER_STATUS_TONES[document.status]} label={ORDER_STATUS_LABELS[document.status]} /> },
          { label: "Cliente", value: document.customer_name },
          {
            label: "Condición de pago",
            value:
              document.payment_condition === "credit"
                ? `${PAYMENT_CONDITION_LABELS.credit} a ${document.credit_days} días`
                : PAYMENT_CONDITION_LABELS.cash,
          },
          {
            label: "Cotización",
            value: !document.quote_id ? (
              "—"
            ) : canSeeQuotes ? (
              <Link className="underline" to={`/sales/quotes/${document.quote_id}`}>
                {document.quote_number}
              </Link>
            ) : (
              document.quote_number
            ),
          },
        ]}
      />

      {document.status === "cancelled" && document.cancel_reason && (
        <p className="mb-4 rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">Motivo de la cancelación:</span> {document.cancel_reason}
        </p>
      )}
      {document.notes && (
        <section className="mb-6 space-y-1">
          <h2 className="text-sm font-medium">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{document.notes}</p>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="lines-title">
        <h2 id="lines-title" className="text-base font-medium">
          Productos
        </h2>
        <DocumentLinesTable lines={document.items} />
        <TotalsSummary official={document} />
      </section>

      <div className="mt-6">
        <DocumentsPanel entity={{ type: "sale", id: document.id, label: `el pedido ${document.number}` }} canUpload={canAttach} />
      </div>

      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title="Confirmar pedido"
        description="El sistema validará que el cliente esté activo, que haya stock y, si es a crédito, que no exceda su límite."
        confirmText="Confirmar"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => run(() => confirm.mutate(document.id, done))}
      />
      <ReasonDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        title="Cancelar pedido"
        description="Solo se cancela antes de facturar. Indica el motivo."
        confirmLabel="Cancelar pedido"
        isPending={isPending}
        onConfirm={(reason) => run(() => cancel.mutate({ id: document.id, reason }, done))}
      />
      {dialog === "invoice" && (
        <IssueInvoiceDialog
          open
          onOpenChange={(open) => setDialog(open ? "invoice" : null)}
          customerDocumentType={document.customer_document_type}
          isPending={isPending}
          onConfirm={(type) =>
            run(() =>
              issue.mutate(
                { id: document.id, input: { type } },
                { onSuccess: (invoice) => navigate(`/sales/invoices/${invoice.id}`), onError: done.onError },
              ),
            )
          }
        />
      )}
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Eliminar borrador"
        description="Este pedido en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() => run(() => remove.mutate(document.id, { onSuccess: () => navigate("/sales/orders"), onError: done.onError }))}
      />
    </>
  )
}
