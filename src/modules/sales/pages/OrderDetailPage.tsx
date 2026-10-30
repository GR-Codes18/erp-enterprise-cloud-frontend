import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useAuth, useHasPermission } from "@/modules/auth"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { createApprovalNotification } from "@/shared/lib/approvals"
import { formatMoney } from "@/shared/lib/money"
import { IssueInvoiceDialog } from "../components/IssueInvoiceDialog"
import {
  useCancelOrder,
  useConfirmOrder,
  useDeleteOrder,
  useIssueInvoice,
  useOrder,
  useReleaseReservation,
  useReserveOrder,
  useUpdateDeliveryStatus,
} from "../hooks"
import { getReservationSummary } from "../reservations"
import {
  DELIVERY_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_CONDITION_LABELS,
  SALE_TYPE_LABELS,
  canTransitionOrder,
  getDeliveryStatusLabel,
  getNextDeliveryStatus,
} from "../orders/schema"

type Action = "confirm" | "cancel" | "invoice" | "delete" | "reserve" | "release"

export default function OrderDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const order = useOrder(id)
  const confirm = useConfirmOrder()
  const reserve = useReserveOrder()
  const releaseReservation = useReleaseReservation()
  const cancel = useCancelOrder()
  const issue = useIssueInvoice()
  const updateDeliveryStatus = useUpdateDeliveryStatus()
  const remove = useDeleteOrder()
  const canEdit = useHasPermission("sales.orders:edit")
  const canApprove = useHasPermission("sales.orders:approve")
  const canVoid = useHasPermission("sales.orders:void")
  const canInvoice = useHasPermission("sales.invoices:create")
  const canAttach = useHasPermission("documents.files:create")
  const canSeeQuotes = useHasPermission("sales.quotes:view")
  const [dialog, setDialog] = useState<Action | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  type Notice = ReturnType<typeof createApprovalNotification> | { message: string } | null
  const [notice, setNotice] = useState<Notice>(null)
  const [reserveDate, setReserveDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 3)
    return date.toISOString().slice(0, 10)
  })
  const isPending = confirm.isPending || cancel.isPending || issue.isPending || reserve.isPending || releaseReservation.isPending || updateDeliveryStatus.isPending || remove.isPending

  if (order.isPending) return <p role="status">Cargando orden de venta…</p>
  if (order.isError) return <ErrorState message={getErrorMessage(order.error)} onRetry={() => void order.refetch()} />

  const document = order.data
  const isDraft = document.status === "draft"
  const nextDeliveryStatus = getNextDeliveryStatus(document.delivery_method, document.delivery_status)
  const reservationSummary = getReservationSummary({
    status: document.status,
    items: document.items,
  })
  const currentNotice =
    notice ??
    (document.status === "confirmed"
      ? createApprovalNotification({
          entity: "Orden de venta",
          entityCode: document.number,
          actor: user?.name || "Usuario",
          decision: "approved",
        })
      : document.status === "reserved" && document.reservation_expires_at
        ? { message: `Reserva activa hasta ${formatDateTimeLima(document.reservation_expires_at)}` }
        : null)
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
      {(canApprove || canEdit) && (document.status === "draft" || document.status === "reserved") && (
        <Button disabled={isPending} onClick={() => setDialog(document.status === "reserved" ? "release" : "reserve")}>
          {document.status === "reserved" ? "Liberar reserva" : "Reservar"}
        </Button>
      )}
      {canApprove && canTransitionOrder(document.status, "confirmed") && (
        <Button disabled={isPending} onClick={() => setDialog("confirm")}>
          Confirmar orden de venta
        </Button>
      )}
      {canInvoice && canTransitionOrder(document.status, "invoiced") && (
        <Button disabled={isPending} onClick={() => setDialog("invoice")}>
          Emitir comprobante
        </Button>
      )}
      {canEdit && document.sale_type === "wholesale" && !isDraft && document.status !== "cancelled" && nextDeliveryStatus && (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(() =>
              updateDeliveryStatus.mutate(
                { id: document.id, status: nextDeliveryStatus },
                { onSuccess: () => setActionError(null), onError: (error) => setActionError(getErrorMessage(error)) },
              ),
            )
          }
        >
          {document.delivery_method === "shipping"
            ? document.delivery_status === "pending"
              ? "Marcar enviado"
              : "Marcar entregado"
            : document.delivery_status === "pending"
              ? "Marcar listo para recojo"
              : "Marcar como recogido"}
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
      {canVoid && !isDraft && canTransitionOrder(document.status, "cancelled") && (
        <Button variant="destructive" disabled={isPending} onClick={() => setDialog("cancel")}>
          Cancelar orden de venta
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
      <PageHeader
        title={isDraft ? "Detalle del borrador de venta" : "Detalle de la orden de venta"}
        description={
          isDraft
            ? "Este documento aún no es una orden activa: puedes editarlo, reservarlo o eliminarlo."
            : "Revisa el estado, los datos de la venta y los productos."
        }
        actions={<div className="flex flex-wrap gap-2">{actions}</div>}
      />

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}
      {currentNotice && (
        <p role="status" className="mb-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success-foreground">
          {currentNotice.message}
        </p>
      )}
      {(document.status === "confirmed" || document.status === "invoiced") && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {reservationSummary.message}
        </p>
      )}

      <section className="mb-5 flex flex-col gap-4 rounded-xl border bg-gradient-to-r from-primary/10 via-card to-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Orden de venta</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{document.number}</p>
          <p className="mt-1 text-sm text-muted-foreground">Registrado {formatDateTimeLima(document.created_at)}</p>
        </div>
        <div className="flex items-center justify-between gap-6 rounded-lg border bg-background/80 px-4 py-3 sm:min-w-56 sm:flex-col sm:items-end sm:gap-1">
          <StatusBadge tone={ORDER_STATUS_TONES[document.status]} label={ORDER_STATUS_LABELS[document.status]} />
          <p className="font-mono text-xl font-semibold">{formatMoney(document.total)}</p>
        </div>
      </section>

      <DetailGrid
        variant="cards"
        items={[
          { label: "Cliente", value: document.customer_name },
          ...(!document.customer_id && document.buyer_document_number
            ? [{ label: "Documento del comprador", value: `${document.buyer_document_type} ${document.buyer_document_number}` }]
            : []),
          { label: "Tipo de venta", value: SALE_TYPE_LABELS[document.sale_type] },
          ...(document.sale_type === "wholesale"
            ? [
                {
                  label: "Entrega",
                  value: `${DELIVERY_METHOD_LABELS[document.delivery_method]} · ${getDeliveryStatusLabel(document.delivery_method, document.delivery_status)}`,
                },
                ...(document.delivery_method === "shipping"
                  ? [{ label: "Dirección de entrega", value: document.delivery_address || "Sin dirección registrada" }]
                  : []),
              ]
            : []),
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

      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5" aria-labelledby="lines-title">
        <div>
          <h2 id="lines-title" className="text-base font-semibold">Productos de la orden de venta</h2>
          <p className="text-sm text-muted-foreground">Detalle de cantidades, almacén y precio de venta.</p>
        </div>
        <DocumentLinesTable lines={document.items} />
        <TotalsSummary official={document} />
      </section>

      <div className="mt-6">
        <DocumentsPanel entity={{ type: "sale", id: document.id, label: `la orden de venta ${document.number}` }} canUpload={canAttach} />
      </div>

      {dialog === "reserve" && (
        <Dialog open onOpenChange={(open) => setDialog(open ? "reserve" : null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reservar stock</DialogTitle>
              <DialogDescription>Define la fecha límite de la reserva para esta orden de venta.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="reservation_date">
                Fecha límite
              </label>
              <Input
                id="reservation_date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={reserveDate}
                onChange={(event) => setReserveDate(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isPending || reserveDate === ""}
                onClick={() =>
                  run(() =>
                    reserve.mutate(
                      { id: document.id, expires_at: reserveDate },
                      {
                        onSuccess: () => {
                          setDialog(null)
                          setActionError(null)
                          setNotice({ message: `Reserva creada hasta ${formatDateTimeLima(`${reserveDate}T23:59:59Z`)}` })
                        },
                        onError: done.onError,
                      },
                    ),
                  )
                }
              >
                {reserve.isPending ? "Reservando..." : "Reservar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {dialog === "release" && (
        <ConfirmDialog
          open
          onOpenChange={(open) => setDialog(open ? "release" : null)}
          title="Liberar reserva"
          description="La cantidad reservada volverá a estar disponible en el inventario."
          confirmText="Liberar reserva"
          confirmVariant="default"
          isLoading={isPending}
          onConfirm={() =>
            run(() =>
              releaseReservation.mutate(document.id, {
                onSuccess: () => {
                  setDialog(null)
                  setActionError(null)
                  setNotice(null)
                },
                onError: done.onError,
              }),
            )
          }
        />
      )}
      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title="Confirmar orden de venta"
        description="El sistema validará el stock y, si corresponde, que el cliente esté activo y tenga crédito disponible."
        confirmText="Confirmar"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() =>
          run(() =>
            confirm.mutate(document.id, {
              onSuccess: () => {
                setDialog(null)
                setNotice(
                  createApprovalNotification({
                    entity: "Orden de venta",
                    entityCode: document.number,
                    actor: user?.name || "Usuario",
                    decision: "approved",
                  }),
                )
              },
              onError: done.onError,
            }),
          )
        }
      />
      <ReasonDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        title="Cancelar orden de venta"
        description="Solo se cancela antes de facturar. Indica el motivo."
        confirmLabel="Cancelar orden de venta"
        isPending={isPending}
        onConfirm={(reason) => run(() => cancel.mutate({ id: document.id, reason }, done))}
      />
      {dialog === "invoice" && (
        <IssueInvoiceDialog
          open
          onOpenChange={(open) => setDialog(open ? "invoice" : null)}
          customerDocumentType={document.customer_document_type}
          forceReceipt={!document.customer_id}
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
        description="Esta orden de venta en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() => run(() => remove.mutate(document.id, { onSuccess: () => navigate("/sales/orders"), onError: done.onError }))}
      />
    </>
  )
}
