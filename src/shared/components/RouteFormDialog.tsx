import type { ReactNode } from "react"
import { cn } from "cn"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

interface RouteFormDialogProps {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function RouteFormDialog({
  title,
  description,
  onClose,
  children,
  className,
}: RouteFormDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className={cn(
          "max-h-[90vh] gap-5 overflow-y-auto sm:max-w-4xl",
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
