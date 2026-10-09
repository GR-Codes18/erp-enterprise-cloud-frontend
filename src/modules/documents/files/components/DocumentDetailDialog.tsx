import { Download } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { formatFileSize } from "../fileRules"
import { CATEGORY_LABELS, ENTITY_LABELS, type DocumentRecord } from "../schema"

interface DocumentDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se conserva al cerrar para que el contenido no cambie durante la animación */
  document: DocumentRecord | null
  onDownload: (document: DocumentRecord) => void
  isDownloading: boolean
}

export function DocumentDetailDialog({
  open,
  onOpenChange,
  document,
  onDownload,
  isDownloading,
}: DocumentDetailDialogProps) {
  const related = document?.entity_type
    ? `${ENTITY_LABELS[document.entity_type]}${document.entity_label ? ` · ${document.entity_label}` : ""}`
    : "Sin registro relacionado"

  const rows: Array<[string, string]> = document
    ? [
        ["Categoría", CATEGORY_LABELS[document.category]],
        ["Relacionado con", related],
        ["Tipo de archivo", document.mime_type],
        ["Tamaño", formatFileSize(document.size)],
        ["Subido por", document.uploaded_by_name],
        ["Fecha y hora", formatDateTimeLima(document.uploaded_at)],
      ]
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del documento</DialogTitle>
          <DialogDescription>{document?.name}</DialogDescription>
        </DialogHeader>

        <dl className="grid gap-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[10rem_1fr] gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {document && (
            <Button type="button" disabled={isDownloading} onClick={() => onDownload(document)}>
              <Download aria-hidden="true" />
              {isDownloading ? "Descargando..." : "Descargar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}