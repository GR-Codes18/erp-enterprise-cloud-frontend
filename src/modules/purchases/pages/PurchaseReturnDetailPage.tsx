import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DetailGrid } from "@/shared/components/DetailGrid"
import { DocumentLinesTable } from "@/shared/components/DocumentLinesTable"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { purchaseReturnHooks } from "../hooks"
import { PURCHASE_RETURN_STATUS_LABELS, PURCHASE_RETURN_STATUS_TONES, canTransitionPurchaseReturn } from "../returns/schema"

export default function PurchaseReturnDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const purchaseReturn = purchaseReturnHooks.useDetail(id)
  const confirm = purchaseReturnHooks.useAction("confirm")
  const remove = purchaseReturnHooks.useRemove()
  const canEdit = useHasPermission("purchases.returns:create")
  const canVoid = useHasPermission("purchases.returns:void")
  const [dialog, setDialog] = useState<"confirm" | "delete" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = confirm.isPending || remove.isPending

  if (purchaseReturn.isPending) return <p role="status">Cargando devolución…</p>
  if (purchaseReturn.isError) {
    return <ErrorState message={getErrorMessage(purchaseReturn.error)} onRetry={() => void purchaseReturn.refetch()} />
  }

  const document = purchaseReturn.data
  const isDraft = document.status === "draft"
  const onError = (error: unknown) => {
    setDialog(null)
    setActionError(getErrorMessage(error))
  }

  const actions = (
    <>
      {canEdit && canTransitionPurchaseReturn(document.status, "confirmed") && (
        <Button disabled={isPending} onClick={() => setDialog("confirm")}>
          Confirmar devolución
        </Button>
      )}
      {canEdit && isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/purchases/returns/${document.id}/edit`}>Editar borrador</Link>
        </Button>
      )}
      {canVoid && isDraft && (
        <Button variant="ghost" disabled={isPending} onClick={() => setDialog("delete")}>
          Eliminar borrador
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/purchases/returns">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={`Devolución ${document.number}`} description={`Registrada ${formatDateTimeLima(document.created_at)}`} actions={actions} />

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      <DetailGrid
        items={[
          {
            label: "Estado",
            value: <StatusBadge tone={PURCHASE_RETURN_STATUS_TONES[document.status]} label={PURCHASE_RETURN_STATUS_LABELS[document.status]} />,
          },
          {
            label: "Recepción",
            value: (
              <Link className="underline" to={`/purchases/receptions/${document.reception_id}`}>
                {document.reception_number}
              </Link>
            ),
          },
          { label: "Proveedor", value: document.supplier_name },
          { label: "Monto", value: formatMoney(document.total) },
        ]}
      />

      <p className="mb-6 rounded-md border px-3 py-2 text-sm">
        <span className="font-medium">Motivo:</span> {document.reason}
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Productos devueltos</h2>
        <DocumentLinesTable lines={document.items} priceLabel="Costo unitario" />
      </section>

      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title="Confirmar devolución"
        description="El stock bajará y se reducirá lo que se debe al proveedor. Es definitiva."
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
        description="Esta devolución en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() => {
          setActionError(null)
          remove.mutate(document.id, { onSuccess: () => navigate("/purchases/returns"), onError })
        }}
      />
    </>
  )
}
