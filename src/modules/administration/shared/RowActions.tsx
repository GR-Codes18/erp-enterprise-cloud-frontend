import type { ReactNode } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

interface RowActionsProps {
  /** Nombre corto del registro, para los nombres accesibles de los botones */
  label: string
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
  /** Acciones propias de la pantalla (ej. "Ejecutar ahora") */
  extra?: ReactNode
}

/** Botones de editar y eliminar de una fila; solo aparecen los que el usuario puede usar */
export function RowActions({ label, canEdit, canDelete, onEdit, onDelete, extra }: RowActionsProps) {
  return (
    <div className="flex gap-1">
      {extra}
      {canEdit && (
        <Button variant="ghost" size="icon" aria-label={`Editar ${label}`} onClick={onEdit}>
          <Pencil aria-hidden="true" />
        </Button>
      )}
      {canDelete && (
        <Button variant="ghost" size="icon" aria-label={`Eliminar ${label}`} onClick={onDelete}>
          <Trash2 aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
