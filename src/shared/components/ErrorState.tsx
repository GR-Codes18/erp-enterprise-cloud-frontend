import { TriangleAlert } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

interface ErrorStateProps {
  /** Mensaje apto para el usuario final, nunca un error técnico */
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-12 text-center">
      <TriangleAlert className="size-8 text-destructive" aria-hidden="true" />
      <p className="font-medium">No se pudo cargar la información</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}