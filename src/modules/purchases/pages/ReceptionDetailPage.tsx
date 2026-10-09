import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { DocumentsPanel } from "@/modules/documents"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DetailGrid } from "@/shared/components/DetailGrid"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { receptionHooks } from "../hooks"
import { RECEPTION_STATUS_LABELS, RECEPTION_STATUS_TONES, canTransitionReception } from "../receptions/schema"

export default function ReceptionDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const reception = receptionHooks.useDetail(id)
  const confirm = receptionHooks.useAction("confirm")
  const remove = receptionHooks.useRemove()
  const canEdit = useHasPermission("purchases.receptions:create")
  const canVoid = useHasPermission("purchases.receptions:void")
  const canReturn = useHasPermission("purchases.returns:create")
  const canAttach = useHasPermission("documents.files:create")
  const [dialog, setDialog] = useState<"confirm" | "delete" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = confirm.isPending || remove.isPending

  if (reception.isPending) return <p role="status">Cargando recepción…</p>
  if (reception.isError) return <ErrorState message={getErrorMessage(reception.error)} onRetry={() => void reception.refetch()} />

  const document = reception.data
  const isDraft = document.status === "draft"
  const onError = (error: unknown) => {
    setDialog(null)
    setActionError(getErrorMessage(error))
  }

  const actions = (
    <>
      {canEdit && canTransitionReception(document.status, "confirmed") && (
        <Button disabled={isPending} onClick={() => setDialog("confirm")}>
          Confirmar recepción
        </Button>
      )}
      {canReturn && document.status === "confirmed" && (
        <Button variant="outline" asChild>
          <Link to={`/purchases/returns/new?reception=${document.id}`}>Devolver al proveedor</Link>
        </Button>
      )}
      {canEdit && isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/purchases/receptions/${document.id}/edit`}>Editar borrador</Link>
        </Button>
      )}
      {canVoid && isDraft && (
        <Button variant="ghost" disabled={isPending} onClick={() => setDialog("delete")}>
          Eliminar borrador
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/purchases/receptions">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={`Recepción ${document.number}`} description={`Registrada ${formatDateTimeLima(document.created_at)}`} actions={actions} />

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      <DetailGrid
        items={[
          { label: "Estado", value: <StatusBadge tone={RECEPTION_STATUS_TONES[document.status]} label={RECEPTION_STATUS_LABELS[document.status]} /> },
          {
            label: "Orden de compra",
            value: (
              <Link className="underline" to={`/purchases/orders/${document.order_id}`}>
                {document.order_number}
              </Link>
            ),
          },
          { label: "Almacén", value: document.warehouse_name },
          { label: "Guía de remisión", value: document.guide_number },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-base font-medium">Productos recibidos</h2>
        <ul className="divide-y rounded-md border">
          {document.items.map((item) => (
            <li key={item.product_id} className="flex flex-wrap justify-between gap-4 px-4 py-3">
              <span>{item.product_name}</span>
              <span className="font-mono">
                {item.quantity}
                {item.returned_quantity > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">(devueltas {item.returned_quantity})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6">
        <DocumentsPanel entity={{ type: "purchase", id: document.id, label: `la recepción ${document.number}` }} canUpload={canAttach} />
      </div>

      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title="Confirmar recepción"
        description="Subirá el stock del almacén y actualizará la orden. Es definitiva: un error se corrige con una devolución."
        confirmText="Confirmar"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => {
          setActionError(null)
          confirm.mutate({ id: document.id }, { onSuccess: () => setDialog(null), onError })
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Eliminar borrador"
        description="Esta recepción en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() => {
          setActionError(null)
          remove.mutate(document.id, { onSuccess: () => navigate("/purchases/receptions"), onError })
        }}
      />
    </>
  )
}
