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
import { formatBusinessDate } from "@/shared/lib/dates"
import {
  useAcceptQuote,
  useConvertQuote,
  useDeleteQuote,
  useQuote,
  useRejectQuote,
  useSendQuote,
} from "../hooks"
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_TONES, canConvertQuote, canTransitionQuote } from "../quotes/schema"

type Action = "send" | "accept" | "reject" | "convert" | "delete"

export default function QuoteDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const quote = useQuote(id)
  const send = useSendQuote()
  const accept = useAcceptQuote()
  const reject = useRejectQuote()
  const convert = useConvertQuote()
  const remove = useDeleteQuote()
  const canEdit = useHasPermission("sales.quotes:edit")
  const canVoid = useHasPermission("sales.quotes:void")
  const canCreateOrder = useHasPermission("sales.orders:create")
  const canAttach = useHasPermission("documents.files:create")
  const [dialog, setDialog] = useState<Action | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = send.isPending || accept.isPending || reject.isPending || convert.isPending || remove.isPending

  if (quote.isPending) return <p role="status">Cargando cotización…</p>
  if (quote.isError) return <ErrorState message={getErrorMessage(quote.error)} onRetry={() => void quote.refetch()} />

  const document = quote.data
  const isDraft = document.status === "draft"
  // El diálogo se cierra siempre: el resultado o el error se ven en la página
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
      {canEdit && canTransitionQuote(document.status, "sent") && (
        <Button disabled={isPending} onClick={() => setDialog("send")}>
          Enviar al cliente
        </Button>
      )}
      {canEdit && canTransitionQuote(document.status, "accepted") && (
        <Button disabled={isPending} onClick={() => setDialog("accept")}>
          Marcar aceptada
        </Button>
      )}
      {canEdit && canTransitionQuote(document.status, "rejected") && (
        <Button variant="destructive" disabled={isPending} onClick={() => setDialog("reject")}>
          Marcar rechazada
        </Button>
      )}
      {canCreateOrder && canConvertQuote(document) && (
        <Button disabled={isPending} onClick={() => setDialog("convert")}>
          Convertir en orden de venta
        </Button>
      )}
      {document.order_id && (
        <Button variant="outline" asChild>
          <Link to={`/sales/orders/${document.order_id}`}>Ver orden de venta</Link>
        </Button>
      )}
      {canEdit && isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/sales/quotes/${document.id}/edit`}>Editar borrador</Link>
        </Button>
      )}
      {canVoid && isDraft && (
        <Button variant="ghost" disabled={isPending} onClick={() => setDialog("delete")}>
          Eliminar borrador
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/sales/quotes">Volver al listado</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={`Cotización ${document.number}`} description={document.customer_name} actions={actions} />

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      <DetailGrid
        items={[
          { label: "Estado", value: <StatusBadge tone={QUOTE_STATUS_TONES[document.status]} label={QUOTE_STATUS_LABELS[document.status]} /> },
          { label: "Cliente", value: document.customer_name },
          { label: "Emisión", value: formatBusinessDate(document.issue_date) },
          { label: "Válida hasta", value: formatBusinessDate(document.valid_until) },
        ]}
      />

      {document.status === "rejected" && document.rejection_reason && (
        <p className="mb-4 rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">Motivo del rechazo:</span> {document.rejection_reason}
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
        <DocumentsPanel entity={{ type: "sale", id: document.id, label: `la cotización ${document.number}` }} canUpload={canAttach} />
      </div>

      <ConfirmDialog
        open={dialog === "send"}
        onOpenChange={(open) => setDialog(open ? "send" : null)}
        title="Enviar cotización"
        description="Después de enviarla ya no se puede editar. El cliente podrá aceptarla o rechazarla."
        confirmText="Enviar"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => run(() => send.mutate(document.id, done))}
      />
      <ConfirmDialog
        open={dialog === "accept"}
        onOpenChange={(open) => setDialog(open ? "accept" : null)}
        title="Marcar como aceptada"
        description="Registra que el cliente aceptó la cotización. Luego podrás convertirla en orden de venta."
        confirmText="Marcar aceptada"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() => run(() => accept.mutate(document.id, done))}
      />
      <ReasonDialog
        open={dialog === "reject"}
        onOpenChange={(open) => setDialog(open ? "reject" : null)}
        title="Marcar como rechazada"
        description="Indica por qué el cliente rechazó la cotización."
        confirmLabel="Marcar rechazada"
        isPending={isPending}
        onConfirm={(reason) => run(() => reject.mutate({ id: document.id, reason }, done))}
      />
      <ConfirmDialog
        open={dialog === "convert"}
        onOpenChange={(open) => setDialog(open ? "convert" : null)}
        title="Convertir en orden de venta"
        description="Se creará una orden de venta en borrador con el cliente y los productos de esta cotización."
        confirmText="Crear orden de venta"
        confirmVariant="default"
        isLoading={isPending}
        onConfirm={() =>
          run(() =>
            convert.mutate(document.id, {
              onSuccess: (order) => navigate(`/sales/orders/${order.id}`),
              onError: done.onError,
            }),
          )
        }
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Eliminar borrador"
        description="Esta cotización en borrador se eliminará definitivamente."
        confirmText="Eliminar borrador"
        isLoading={isPending}
        onConfirm={() =>
          run(() => remove.mutate(document.id, { onSuccess: () => navigate("/sales/quotes"), onError: done.onError }))
        }
      />
    </>
  )
}
