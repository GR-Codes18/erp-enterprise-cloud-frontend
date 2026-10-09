import type { ReactNode } from "react"

export interface DetailItem {
  label: string
  value: ReactNode
}

/** Datos de un documento en modo lectura: etiqueta arriba, valor abajo, en columnas */
export function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <dl className="mb-6 grid gap-4 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 break-words font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
