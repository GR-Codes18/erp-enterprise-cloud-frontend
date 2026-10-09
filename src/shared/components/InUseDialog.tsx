import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

interface InUseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceName: string
  /** Motivo que explica el backend (409); si no llega, se usa un texto genérico */
  message?: string
  isPending?: boolean
  onDeactivate: () => void | Promise<void>
}

export default function InUseDialog({
  open,
  onOpenChange,
  resourceName,
  message,
  isPending = false,
  onDeactivate,
}: InUseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{resourceName} en uso</DialogTitle>
          <DialogDescription>
            {message ||
              "No se puede eliminar porque tiene registros o movimientos asociados. Puedes desactivarlo para que no se use en nuevas operaciones."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={isPending} onClick={onDeactivate}>
            {isPending ? "Procesando..." : "Desactivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}