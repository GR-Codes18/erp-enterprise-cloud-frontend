import type { ReactNode } from "react"
import { Label } from "@/shared/components/ui/label"

interface FieldProps {
  /** Debe coincidir con el `id` del control que se pasa como hijo */
  id: string
  label: string
  /** Mensaje de validación; si existe se muestra bajo el control */
  error?: string
  children: ReactNode
}

/**
 * Etiqueta + control + error. El control hijo debe llevar `id={id}` y, cuando
 * haya error, `aria-describedby={`${id}-error`}` y `aria-invalid`.
 */
export function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
}