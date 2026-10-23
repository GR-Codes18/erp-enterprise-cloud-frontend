import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  /** Botones de acción (ej. "Nuevo cliente") */
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-gradient-to-r from-white via-slate-50 to-blue-50 px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">Resumen</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}