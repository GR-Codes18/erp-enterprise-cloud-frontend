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
import { useConfirmReturn, useDeleteReturn, useReturn } from "../hooks"
import { RETURN_STATUS_LABELS, RETURN_STATUS_TONES, canTransitionReturn } from "../returns/schema"

export default function ReturnDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const salesReturn = useReturn(id)
  const confirm = useConfirmReturn()
  const remove = useDeleteReturn()
  const canEdit = useHasPermission("sales.returns:create")
  const canApprove = useHasPermission("sales.returns:approve")
  const canVoid = useHasPermission("sales.returns:void")
  const [dialog, setDialog] = useState<"confirm" | "delete" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = confirm.isPending || remove.isPending

  if (salesReturn.isPending) return <p role="status">Cargando devolución…</p>
  if (salesReturn.isError) {
    return <ErrorState message={getErrorMessage(salesReturn.error)} onRetry={() => void salesReturn.refetch()} />
  }

  const document = salesReturn.data
  const isDraft = document.status === "draft"
  const onError = (error: unknown) => {
    setDialog(null)
    setActionError(getErrorMessage(error))
  }

  const actions = (
    <>
      {canApprove && canTransitionReturn(document.status, "confirmed") && (
        <Button disabled={isPending} onClick={() => setDialog("confirm")}>
          Confirmar devolución
        </Button>
      )}
      {canEdit && isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/sales/returns/${document.id}/edit`}>Editar borrador</Link>
        </Button>
      )}
      {canVoid && isDraft && (
        <Button variant="ghost" disabled={isPending} onClick={() => setDialog("delete")}>
          Eliminar borrador
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/sales/returns">Volver al listado</Link>
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
          { label: "Estado", value: <StatusBadge tone={RETURN_STATUS_TONES[document.status]} label={RETURN_STATUS_LABELS[document.status]} /> },
          {
            label: "Comprobante",
            value: <Link className="underline" to={`/sales/invoices/${document.invoice_id}`}>{document.invoice_code}</Link>,
          },
          { label: "Cliente", value: document.customer_name },
          { label: "Nota de crédito", value: formatMoney(document.total) },
        ]}
      />

      <p className="mb-6 rounded-md border px-3 py-2 text-sm">
        <span className="font-medium">Motivo:</span> {document.reason}
      </p>

      <section className="space-y-3" aria-labelledby="lines-title">
        <h2 id="lines-title" className="text-base font-medium">
          Productos devueltos
        </h2>
        <DocumentLinesTable lines={document.items} />
      </section>

      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title="Confirmar devolución"
        description="Se emitirá la nota de crédito, el stock reingresará y se reducirá la deuda del cliente. Es definitiva."
        confirmText="Confirmar"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => {
          setActionError(null)
          confirm.mutate(document.id, { onSuccess: () => setDialog(null), onError })
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
          remove.mutate(document.id, { onSuccess: () => navigate("/sales/returns"), onError })
        }}
      />
    </>
  )
}
