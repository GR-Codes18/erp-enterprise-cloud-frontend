import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  /** Botones de acción (ej. "Nuevo cliente") */
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}