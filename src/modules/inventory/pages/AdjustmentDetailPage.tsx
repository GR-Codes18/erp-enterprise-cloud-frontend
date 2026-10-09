import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { DocumentsPanel } from "@/modules/documents"
import { useHasPermission } from "@/modules/auth"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { useAdjustment, useApplyAdjustment, useDeleteAdjustment } from "../adjustments/hooks"
import {
  ADJUSTMENT_REASON_LABELS,
  ADJUSTMENT_STATUS_LABELS,
  canTransitionAdjustment,
} from "../adjustments/schema"

export default function AdjustmentDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const adjustment = useAdjustment(id)
  const apply = useApplyAdjustment()
  const remove = useDeleteAdjustment()
  const [confirmAction, setConfirmAction] = useState<"apply" | "delete" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const canApprove = useHasPermission("inventory.adjustments:approve")
  const canAttach = useHasPermission("documents.files:create")
  const canEdit = useHasPermission("inventory.adjustments:edit")
  const isPending = apply.isPending || remove.isPending

  if (adjustment.isPending) return <p role="status">Cargando ajuste…</p>
  if (adjustment.isError) {
    return <ErrorState message={getErrorMessage(adjustment.error)} onRetry={() => void adjustment.refetch()} />
  }
  if (!adjustment.data) return <ErrorState message="No se encontró el ajuste." />

  const document = adjustment.data
  const runApply = () => {
    setActionError(null)
    apply.mutate(document.id, {
      onSuccess: () => setConfirmAction(null),
      onError: (error) => {
        setConfirmAction(null)
        setActionError(getErrorMessage(error))
      },
    })
  }

  const actions = (
    <>
      {document.status === "draft" && (
        <>
          {canEdit && (
            <Button variant="outline" asChild>
              <Link to={`/inventory/adjustments/${document.id}/edit`}>Editar borrador</Link>
            </Button>
          )}
          {canTransitionAdjustment(document.status, "applied") && canApprove && (
            <Button disabled={isPending} onClick={() => setConfirmAction("apply")}>Aplicar ajuste</Button>
          )}
          {canEdit && (
            <Button variant="ghost" disabled={isPending} onClick={() => setConfirmAction("delete")}>
              Eliminar borrador
            </Button>
          )}
        </>
      )}
      <Button variant="outline" asChild>
        <Link to="/inventory/adjustments">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader
        title={`Ajuste ${document.number}`}
        description={`Registrado ${formatDateTimeLima(document.created_at)}`}
        actions={actions}
      />

      {actionError && <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">{actionError}</p>}
      {document.status === "draft" && !canApprove && (
        <p className="mb-4 rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Necesitas el permiso de aprobación para aplicar este ajuste.
        </p>
      )}

      <section className="mb-6 grid gap-4 rounded-md border p-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">Estado</p>
          <StatusBadge tone={document.status === "applied" ? "success" : "neutral"} label={ADJUSTMENT_STATUS_LABELS[document.status]} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Almacén</p>
          <p className="font-medium">{document.warehouse_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Motivo</p>
          <p className="font-medium">{ADJUSTMENT_REASON_LABELS[document.reason]}</p>
        </div>
      </section>

      {document.notes && (
        <section className="mb-6 space-y-1">
          <h2 className="text-sm font-medium">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{document.notes}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-medium">Productos</h2>
        <div className="divide-y rounded-md border">
          {document.items.map((item, index) => (
            <div key={`${item.product_id}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
              <span>{item.product_name ?? item.product_id}</span>
              <span className="font-medium">
                {item.direction === "increase" ? "Aumento" : "Disminución"} · {item.quantity}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <DocumentsPanel
          entity={{ type: "adjustment", id: document.id, label: `el ajuste ${document.number}` }}
          canUpload={canAttach}
        />
      </div>

      <ConfirmDialog
        open={confirmAction === "apply"}
        onOpenChange={(open) => setConfirmAction(open ? "apply" : null)}
        title="Aplicar ajuste"
        description="Al aplicarlo, el ajuste será inmutable y el backend actualizará las existencias."
        confirmText="Aplicar ajuste"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={runApply}
      />
      <ConfirmDialog
        open={confirmAction === "delete"}
        onOpenChange={(open) => setConfirmAction(open ? "delete" : null)}
        title="Eliminar borrador"
        description="Este ajuste en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() => {
          setActionError(null)
          remove.mutate(document.id, {
            onSuccess: () => navigate("/inventory/adjustments"),
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
