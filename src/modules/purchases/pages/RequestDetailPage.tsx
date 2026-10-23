import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useAuth, useHasPermission } from "@/modules/auth"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DetailGrid } from "@/shared/components/DetailGrid"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import ReasonDialog from "@/shared/components/ReasonDialog"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate, formatDateTimeLima } from "@/shared/lib/dates"
import { createApprovalNotification } from "@/shared/lib/approvals"
import { requestHooks } from "../hooks"
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_TONES, canDecideRequest, canTransitionRequest } from "../requests/schema"

type Dialog = "submit" | "approve" | "reject" | "delete"

export default function RequestDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const request = requestHooks.useDetail(id)
  const submit = requestHooks.useAction("submit")
  const approve = requestHooks.useAction("approve")
  const reject = requestHooks.useAction("reject")
  const remove = requestHooks.useRemove()
  const canEdit = useHasPermission("purchases.requests:edit")
  const canApprove = useHasPermission("purchases.requests:approve")
  const canVoid = useHasPermission("purchases.requests:void")
  const canCreateOrder = useHasPermission("purchases.orders:create")
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<ReturnType<typeof createApprovalNotification> | null>(null)
  const isPending = submit.isPending || approve.isPending || reject.isPending || remove.isPending

  if (request.isPending) return <p role="status">Cargando solicitud…</p>
  if (request.isError) return <ErrorState message={getErrorMessage(request.error)} onRetry={() => void request.refetch()} />

  const document = request.data
  const isDraft = document.status === "draft"
  const canDecide = canApprove && canDecideRequest(document, user?.id)
  const isOwnPending = document.status === "pending" && document.requested_by === user?.id
  const statusNotice =
    document.status === "approved"
      ? createApprovalNotification({
          entity: "Solicitud de compra",
          entityCode: document.number,
          actor: document.decided_by_name || user?.name || "Usuario",
          decision: "approved",
        })
      : document.status === "rejected"
        ? createApprovalNotification({
            entity: "Solicitud de compra",
            entityCode: document.number,
            actor: document.decided_by_name || user?.name || "Usuario",
            decision: "rejected",
            reason: document.rejection_reason || undefined,
          })
        : null
  const currentNotice = notice ?? statusNotice
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
      {canEdit && canTransitionRequest(document.status, "pending") && (
        <Button disabled={isPending} onClick={() => setDialog("submit")}>
          Enviar a aprobación
        </Button>
      )}
      {canDecide && (
        <>
          <Button disabled={isPending} onClick={() => setDialog("approve")}>
            Aprobar
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={() => setDialog("reject")}>
            Rechazar
          </Button>
        </>
      )}
      {canCreateOrder && document.status === "approved" && (
        <Button asChild>
          <Link to={`/purchases/orders/new?request=${document.id}`}>Crear orden de compra</Link>
        </Button>
      )}
      {canEdit && isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/purchases/requests/${document.id}/edit`}>Editar borrador</Link>
        </Button>
      )}
      {canVoid && isDraft && (
        <Button variant="ghost" disabled={isPending} onClick={() => setDialog("delete")}>
          Eliminar borrador
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/purchases/requests">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={`Solicitud ${document.number}`} description={`Registrada ${formatDateTimeLima(document.created_at)}`} actions={actions} />

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
      {canApprove && isOwnPending && (
        <p className="mb-4 rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Tú hiciste esta solicitud: la debe aprobar otra persona.
        </p>
      )}

      <DetailGrid
        items={[
          { label: "Estado", value: <StatusBadge tone={REQUEST_STATUS_TONES[document.status]} label={REQUEST_STATUS_LABELS[document.status]} /> },
          { label: "Solicitante", value: document.requested_by_name },
          { label: "Se necesita para", value: formatBusinessDate(document.needed_by) },
          { label: "Decidió", value: document.decided_by_name || "—" },
        ]}
      />

      <section className="mb-6 space-y-1">
        <h2 className="text-sm font-medium">Justificación</h2>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{document.justification}</p>
      </section>
      {document.status === "rejected" && document.rejection_reason && (
        <p className="mb-6 rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">Motivo del rechazo:</span> {document.rejection_reason}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-medium">Productos solicitados</h2>
        <ul className="divide-y rounded-md border">
          {document.items.map((item) => (
            <li key={item.product_id} className="flex justify-between gap-4 px-4 py-3">
              <span>{item.product_name}</span>
              <span className="font-mono">{item.quantity}</span>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={dialog === "submit"}
        onOpenChange={(open) => setDialog(open ? "submit" : null)}
        title="Enviar a aprobación"
        description="Después de enviarla ya no se puede editar."
        confirmText="Enviar"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => run(() => submit.mutate({ id: document.id }, done))}
      />
      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => setDialog(open ? "approve" : null)}
        title="Aprobar solicitud"
        description="Con la solicitud aprobada se puede crear la orden de compra."
        confirmText="Aprobar"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() =>
          run(() =>
            approve.mutate(
              { id: document.id },
              {
                onSuccess: () => {
                  setDialog(null)
                  setNotice(
                    createApprovalNotification({
                      entity: "Solicitud de compra",
                      entityCode: document.number,
                      actor: user?.name || "Usuario",
                      decision: "approved",
                    }),
                  )
                },
                onError: done.onError,
              },
            ),
          )
        }
      />
      <ReasonDialog
        open={dialog === "reject"}
        onOpenChange={(open) => setDialog(open ? "reject" : null)}
        title="Rechazar solicitud"
        description="Indica el motivo del rechazo: lo verá el solicitante."
        confirmLabel="Rechazar"
        isPending={isPending}
        onConfirm={(reason) =>
          run(() =>
            reject.mutate(
              { id: document.id, reason },
              {
                onSuccess: () => {
                  setDialog(null)
                  setNotice(
                    createApprovalNotification({
                      entity: "Solicitud de compra",
                      entityCode: document.number,
                      actor: user?.name || "Usuario",
                      decision: "rejected",
                      reason,
                    }),
                  )
                },
                onError: done.onError,
              },
            ),
          )
        }
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Eliminar borrador"
        description="Esta solicitud en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() => run(() => remove.mutate(document.id, { onSuccess: () => navigate("/purchases/requests"), onError: done.onError }))}
      />
    </>
  )
}
