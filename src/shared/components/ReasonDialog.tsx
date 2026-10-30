import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { reasonSchema, type ReasonFormValues } from "@/shared/lib/reasonSchema"

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  isPending?: boolean
  onConfirm: (reason: string) => void | Promise<void>
}

export default function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  isPending = false,
  onConfirm,
}: ReasonDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReasonFormValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: {
      reason: "",
    },
  })

  useEffect(() => {
    if (!open) {
      reset({ reason: "" })
    }
  }, [open, reset])

  const onSubmit = (values: ReasonFormValues) => {
    onConfirm(values.reason)
  }

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reason-textarea">Motivo</Label>
            <Textarea
              id="reason-textarea"
              placeholder="Escribe la razón o justificación..."
              disabled={isPending}
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-xs font-medium text-destructive">
                {errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Procesando..." : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}