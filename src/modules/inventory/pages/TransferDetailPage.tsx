import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { DocumentsPanel } from "@/modules/documents"
import { useHasPermission } from "@/modules/auth"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import ReasonDialog from "@/shared/components/ReasonDialog"
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
  const canAttach = useHasPermission("documents.files:create")
  // Enviar y recibir mueven el documento (editar); cancelar y borrar lo anulan
  const canEdit = useHasPermission("inventory.transfers:edit")
  const canVoid = useHasPermission("inventory.transfers:void")
  const [confirmAction, setConfirmAction] = useState<"send" | "receive" | "cancel" | "delete" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = send.isPending || receive.isPending || cancel.isPending || remove.isPending

  if (transfer.isPending) return <p role="status">Cargando transferencia…</p>
  if (transfer.isError) {
    return <ErrorState message={getErrorMessage(transfer.error)} onRetry={() => void transfer.refetch()} />
  }
  if (!transfer.data) return <ErrorState message="No se encontró la transferencia." />

  const document = transfer.data
  // Solo un borrador se edita o se borra (regla 5); cancelar lo decide el mapa de transiciones
  const isDraft = document.status === "draft"
  const runAction = (action: "send" | "receive" | "cancel", reason = "") => {
    setActionError(null)
    const options = {
      // Se cierra el diálogo en ambos casos: el error se muestra en la página
      onError: (error: unknown) => {
        setConfirmAction(null)
        setActionError(getErrorMessage(error))
      },
      onSuccess: () => setConfirmAction(null),
    }
    if (action === "send") send.mutate(document.id, options)
    if (action === "receive") receive.mutate(document.id, options)
    if (action === "cancel") cancel.mutate({ id: document.id, reason }, options)
  }

  const actions = (
    <>
      {canEdit && canTransitionTransfer(document.status, "in_transit") && (
        <Button disabled={isPending} onClick={() => setConfirmAction("send")}>Enviar</Button>
      )}
      {canEdit && canTransitionTransfer(document.status, "received") && (
        <Button disabled={isPending} onClick={() => setConfirmAction("receive")}>Recibir</Button>
      )}
      {canEdit && isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/inventory/transfers/${document.id}/edit`}>Editar borrador</Link>
        </Button>
      )}
      {canVoid && canTransitionTransfer(document.status, "cancelled") && (
        <Button variant="destructive" disabled={isPending} onClick={() => setConfirmAction("cancel")}>
          Cancelar transferencia
        </Button>
      )}
      {canVoid && isDraft && (
        <Button variant="ghost" disabled={isPending} onClick={() => setConfirmAction("delete")}>
          Eliminar borrador
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/inventory/transfers">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader
        title={`Transferencia ${document.number}`}
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

      {document.status === "cancelled" && document.cancel_reason && (
        <p className="mb-4 rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">Motivo de la cancelación:</span> {document.cancel_reason}
        </p>
      )}

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

      <div className="mt-6">
        <DocumentsPanel
          entity={{ type: "transfer", id: document.id, label: `la transferencia ${document.number}` }}
          canUpload={canAttach}
        />
      </div>

      <ConfirmDialog
        open={confirmAction === "send"}
        onOpenChange={(open) => setConfirmAction(open ? "send" : null)}
        title="Enviar transferencia"
        description={`Se descontará el stock de ${document.origin_warehouse_name}. Después de enviarla ya no se puede editar ni cancelar.`}
        confirmText="Enviar"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => runAction("send")}
      />
      <ConfirmDialog
        open={confirmAction === "receive"}
        onOpenChange={(open) => setConfirmAction(open ? "receive" : null)}
        title="Recibir transferencia"
        description={`Se sumará el stock en ${document.destination_warehouse_name}. La recepción es definitiva.`}
        confirmText="Recibir"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => runAction("receive")}
      />
      <ReasonDialog
        open={confirmAction === "cancel"}
        onOpenChange={(open) => setConfirmAction(open ? "cancel" : null)}
        title="Cancelar transferencia"
        description="La transferencia en borrador quedará cancelada y no se podrá reactivar. Indica el motivo."
        confirmLabel="Cancelar transferencia"
        isPending={isPending}
        onConfirm={(reason) => runAction("cancel", reason)}
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
