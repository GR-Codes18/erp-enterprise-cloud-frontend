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
  isPending?: boolean
  onDeactivate: () => void | Promise<void>
}

export default function InUseDialog({
  open,
  onOpenChange,
  resourceName,
  isPending = false,
  onDeactivate,
}: InUseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{resourceName} en uso</DialogTitle>
          <DialogDescription>
            Este {resourceName.toLowerCase()} no se puede eliminar porque tiene registros o
            movimientos asociados. ¿Deseas desactivarlo para que no se utilice en nuevas
            operaciones?
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