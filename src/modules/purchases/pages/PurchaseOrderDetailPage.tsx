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
import { formatBusinessDate, formatDateTimeLima } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { purchaseOrderHooks } from "../hooks"
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_TONES,
  canCancelPurchaseOrder,
  canReceive,
  canTransitionPurchaseOrder,
} from "../orders/schema"

type Dialog = "issue" | "cancel" | "delete"

export default function PurchaseOrderDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const order = purchaseOrderHooks.useDetail(id)
  const issue = purchaseOrderHooks.useAction("issue")
  const cancel = purchaseOrderHooks.useAction("cancel")
  const remove = purchaseOrderHooks.useRemove()
  const canEdit = useHasPermission("purchases.orders:edit")
  const canVoid = useHasPermission("purchases.orders:void")
  const canReceiveGoods = useHasPermission("purchases.receptions:create")
  const canRegisterInvoice = useHasPermission("purchases.invoices:create")
  const canAttach = useHasPermission("documents.files:create")
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = issue.isPending || cancel.isPending || remove.isPending

  if (order.isPending) return <p role="status">Cargando orden…</p>
  if (order.isError) return <ErrorState message={getErrorMessage(order.error)} onRetry={() => void order.refetch()} />

  const document = order.data
  const isDraft = document.status === "draft"
  const hasReceptions = document.items.some((item) => item.received_quantity > 0)
  const done = {
    onSuccess: () => setDialog(null),
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
      {canEdit && canTransitionPurchaseOrder(document.status, "issued") && (
        <Button disabled={isPending} onClick={() => setDialog("issue")}>
          Emitir al proveedor
        </Button>
      )}
      {canReceiveGoods && canReceive(document) && (
        <Button asChild>
          <Link to={`/purchases/receptions/new?order=${document.id}`}>Registrar recepción</Link>
        </Button>
      )}
      {canRegisterInvoice && hasReceptions && (
        <Button variant="outline" asChild>
          <Link to={`/purchases/invoices/new?order=${document.id}`}>Registrar factura</Link>
        </Button>
      )}
      {canEdit && isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/purchases/orders/${document.id}/edit`}>Editar borrador</Link>
        </Button>
      )}
      {canVoid && canCancelPurchaseOrder(document) && (
        <Button variant="destructive" disabled={isPending} onClick={() => setDialog("cancel")}>
          Cancelar orden
        </Button>
      )}
      {canVoid && isDraft && (
        <Button variant="ghost" disabled={isPending} onClick={() => setDialog("delete")}>
          Eliminar borrador
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/purchases/orders">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader
        title="Detalle de la orden de compra"
        description="Consulta lo pactado con el proveedor y controla las recepciones."
        actions={<div className="flex flex-wrap gap-2">{actions}</div>}
      />

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      <section className="mb-5 flex flex-col gap-4 rounded-xl border bg-gradient-to-r from-primary/10 via-card to-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Orden de compra</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{document.number}</p>
          <p className="mt-1 text-sm text-muted-foreground">Registrada {formatDateTimeLima(document.created_at)}</p>
        </div>
        <div className="flex items-center justify-between gap-6 rounded-lg border bg-background/80 px-4 py-3 sm:min-w-56 sm:flex-col sm:items-end sm:gap-1">
          <StatusBadge tone={PURCHASE_ORDER_STATUS_TONES[document.status]} label={PURCHASE_ORDER_STATUS_LABELS[document.status]} />
          <p className="font-mono text-xl font-semibold">{formatMoney(document.total)}</p>
        </div>
      </section>

      <DetailGrid
        variant="cards"
        items={[
          { label: "Proveedor", value: document.supplier_name },
          { label: "Entrega esperada", value: formatBusinessDate(document.expected_date) },
          {
            label: "Solicitud",
            value: document.request_id ? (
              <Link className="underline" to={`/purchases/requests/${document.request_id}`}>
                {document.request_number}
              </Link>
            ) : (
              "—"
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

      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5" aria-labelledby="lines-title">
        <div>
          <h2 id="lines-title" className="text-base font-semibold">Productos de la orden</h2>
          <p className="text-sm text-muted-foreground">Cantidades pactadas, costo unitario y recibido.</p>
        </div>
        <DocumentLinesTable
          lines={document.items}
          priceLabel="Costo unitario"
          extraColumn={{ header: "Recibido", cell: (line) => line.received_quantity }}
        />
        <TotalsSummary official={document} />
      </section>

      <div className="mt-6">
        <DocumentsPanel entity={{ type: "purchase", id: document.id, label: `la orden ${document.number}` }} canUpload={canAttach} />
      </div>

      <ConfirmDialog
        open={dialog === "issue"}
        onOpenChange={(open) => setDialog(open ? "issue" : null)}
        title="Emitir orden al proveedor"
        description="Después de emitirla ya no se puede editar. Las recepciones registrarán lo que llegue."
        confirmText="Emitir"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => run(() => issue.mutate({ id: document.id }, done))}
      />
      <ReasonDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        title="Cancelar orden"
        description="Solo se cancela una orden sin recepciones. Indica el motivo."
        confirmLabel="Cancelar orden"
        isPending={isPending}
        onConfirm={(reason) => run(() => cancel.mutate({ id: document.id, reason }, done))}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Eliminar borrador"
        description="Esta orden en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() => run(() => remove.mutate(document.id, { onSuccess: () => navigate("/purchases/orders"), onError: done.onError }))}
      />
    </>
  )
}
