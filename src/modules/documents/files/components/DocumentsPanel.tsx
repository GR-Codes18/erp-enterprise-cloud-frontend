import { useState } from "react"
import { Download, Paperclip } from "lucide-react"
import { ErrorState } from "@/shared/components/ErrorState"
import { Pagination } from "@/shared/components/Pagination"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { formatFileSize } from "../fileRules"
import { useDocuments, useDownloadDocument } from "../hooks"
import { CATEGORY_LABELS } from "../schema"
import { UploadDocumentDialog, type DocumentEntity } from "./UploadDocumentDialog"

const PAGE_SIZE = 5

interface DocumentsPanelProps {
  entity: DocumentEntity
  /** Sin permiso de crear en el módulo dueño, el panel queda en solo lectura */
  canUpload?: boolean
}

/**
 * Documentos adjuntos a una operación (venta, compra, transferencia...), para incrustar en
 * el detalle de otros módulos. Lista, descarga con enlace temporal y adjunta archivos nuevos.
 * Anular un documento se hace desde el repositorio (Documentos > Archivos).
 */
export function DocumentsPanel({ entity, canUpload = true }: DocumentsPanelProps) {
  const [page, setPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const documents = useDocuments({
    page,
    size: PAGE_SIZE,
    filters: { entity_type: entity.type, entity_id: entity.id },
  })
  const download = useDownloadDocument()

  const items = documents.data?.items ?? []

  return (
    <section aria-labelledby="documents-panel-title" className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="documents-panel-title" className="flex items-center gap-2 text-base font-medium">
          <Paperclip aria-hidden="true" className="size-4" />
          Documentos adjuntos
        </h2>
        {canUpload && (
          <Button type="button" variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            Adjuntar documento
          </Button>
        )}
      </div>

      {downloadError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {downloadError}
        </p>
      )}

      {documents.isError ? (
        <ErrorState message={getErrorMessage(documents.error)} onRetry={() => void documents.refetch()} />
      ) : documents.isPending ? (
        <div className="space-y-2" role="status" aria-label="Cargando documentos">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta operación aún no tiene documentos adjuntos.</p>
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {items.map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[document.category]} · {formatFileSize(document.size)} ·{" "}
                    {formatDateTimeLima(document.uploaded_at)} · {document.uploaded_by_name}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Descargar ${document.name}`}
                  disabled={download.isPending}
                  onClick={() => {
                    setDownloadError(null)
                    download.mutate(
                      { id: document.id, name: document.name },
                      { onError: (error) => setDownloadError(getErrorMessage(error)) },
                    )
                  }}
                >
                  <Download aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          {(documents.data?.pages ?? 1) > 1 && (
            <Pagination
              page={documents.data?.page ?? 1}
              pages={documents.data?.pages ?? 1}
              total={documents.data?.total ?? 0}
              disabled={documents.isFetching}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} entity={entity} />
    </section>
  )
}
