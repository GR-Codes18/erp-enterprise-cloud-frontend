import { cn } from "cn"
import type { ReactNode } from "react"

export interface DetailItem {
  label: string
  value: ReactNode
}

/** Datos de un documento en modo lectura: etiqueta arriba, valor abajo, en columnas */
export function DetailGrid({
  items,
  className,
  variant = "default",
}: {
  items: DetailItem[]
  className?: string
  variant?: "default" | "cards"
}) {
  return (
    <dl className={cn("mb-6 grid gap-4 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0", variant === "cards" && "rounded-lg bg-muted/30 p-3")}>
          <dt className={cn("text-sm text-muted-foreground", variant === "cards" && "text-xs font-medium uppercase tracking-wide")}>
            {item.label}
          </dt>
          <dd className={cn("mt-0.5 break-words font-medium", variant === "cards" && "mt-1 text-sm")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
