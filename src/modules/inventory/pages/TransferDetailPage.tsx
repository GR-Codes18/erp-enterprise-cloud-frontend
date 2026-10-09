import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { useCancelTransfer, useDeleteTransfer, useReceiveTransfer, useSendTransfer, useTransfer } from "../transfers/hooks"
import {
  TRANSFER_STATUS_LABELS,
  canTransitionTransfer,
} from "../transfers/schema"

export default function TransferDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const transfer = useTransfer(id)
  const send = useSendTransfer()
  const receive = useReceiveTransfer()
  const cancel = useCancelTransfer()
  const remove = useDeleteTransfer()
  const [confirmAction, setConfirmAction] = useState<"cancel" | "delete" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = send.isPending || receive.isPending || cancel.isPending || remove.isPending

  if (transfer.isPending) return <p role="status">Cargando transferencia…</p>
  if (transfer.isError) {
    return <ErrorState message={getErrorMessage(transfer.error)} onRetry={() => void transfer.refetch()} />
  }
  if (!transfer.data) return <ErrorState message="No se encontró la transferencia." />

  const document = transfer.data
  const runAction = (action: "send" | "receive" | "cancel") => {
    setActionError(null)
    const options = {
      onError: (error: unknown) => setActionError(getErrorMessage(error)),
      onSuccess: () => setConfirmAction(null),
    }
    if (action === "send") send.mutate(document.id, options)
    if (action === "receive") receive.mutate(document.id, options)
    if (action === "cancel") cancel.mutate(document.id, options)
  }

  const actions = (
    <>
      {canTransitionTransfer(document.status, "in_transit") && (
        <Button disabled={isPending} onClick={() => runAction("send")}>Enviar</Button>
      )}
      {canTransitionTransfer(document.status, "received") && (
        <Button disabled={isPending} onClick={() => runAction("receive")}>Recibir</Button>
      )}
      {document.status === "draft" && (
        <>
          <Button variant="outline" asChild>
            <Link to={`/inventory/transfers/${document.id}/edit`}>Editar borrador</Link>
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={() => setConfirmAction("cancel")}>
            Cancelar transferencia
          </Button>
          <Button variant="ghost" disabled={isPending} onClick={() => setConfirmAction("delete")}>
            Eliminar borrador
          </Button>
        </>
      )}
      <Button variant="outline" asChild>
        <Link to="/inventory/transfers">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader
        title="Detalle de transferencia"
        description={`Creada ${formatDateTimeLima(document.created_at)}`}
        actions={actions}
      />

      {actionError && <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">{actionError}</p>}

      <section className="mb-6 grid gap-4 rounded-md border p-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">Estado</p>
          <StatusBadge tone={document.status === "received" ? "success" : "neutral"} label={TRANSFER_STATUS_LABELS[document.status]} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Origen</p>
          <p className="font-medium">{document.origin_warehouse_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Destino</p>
          <p className="font-medium">{document.destination_warehouse_name}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Productos</h2>
        <div className="divide-y rounded-md border">
          {document.items.map((item, index) => (
            <div key={`${item.product_id}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
              <span>{item.product_name ?? item.product_id}</span>
              <span className="font-medium">{item.quantity}</span>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirmAction === "cancel"}
        onOpenChange={(open) => setConfirmAction(open ? "cancel" : null)}
        title="Cancelar transferencia"
        description="La transferencia en borrador quedará cancelada y no se podrá reactivar."
        confirmText="Cancelar transferencia"
        isLoading={isPending}
        onConfirm={() => runAction("cancel")}
      />
      <ConfirmDialog
        open={confirmAction === "delete"}
        onOpenChange={(open) => setConfirmAction(open ? "delete" : null)}
        title="Eliminar borrador"
        description="Esta transferencia en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() => {
          setActionError(null)
          remove.mutate(document.id, {
            onSuccess: () => navigate("/inventory/transfers"),
            onError: (error) => {
              setConfirmAction(null)
              setActionError(getErrorMessage(error))
            },
          })
        }}
      />
    </>
  )
}
