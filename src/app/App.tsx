import { APP_NAME } from '@/config/app'
import { Button } from '@/shared/components/ui/button'

const badges = [
  { label: 'Pagado', style: 'bg-success-soft text-success-text' },
  { label: 'Pendiente', style: 'bg-warning-soft text-warning-text' },
  { label: 'Vencido', style: 'bg-danger-soft text-danger-text' },
  { label: 'Borrador', style: 'bg-neutral-soft text-neutral-text' },
  { label: 'Emitido', style: 'bg-primary-soft text-primary' },
]

export default function App() {
  return (
    <main className="min-h-svh p-8">
      <h1 className="text-2xl font-semibold">{APP_NAME}</h1>
      <p className="text-muted-foreground">Prueba temporal de la paleta.</p>

      <div className="mt-6 flex gap-3">
        <Button>Principal</Button>
        <Button variant="outline">Secundario</Button>
        <Button variant="destructive">Eliminar</Button>
      </div>

      <div className="mt-6 flex gap-2">
        {badges.map((b) => (
          <span key={b.label} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.style}`}>
            {b.label}
          </span>
        ))}
      </div>

      <div className="mt-6 w-60 rounded-lg bg-sidebar p-3 text-sm text-sidebar-foreground">
        <p className="text-xs text-sidebar-muted">VENTAS</p>
        <p className="mt-1 rounded-md bg-sidebar-primary px-2 py-1 text-sidebar-primary-foreground">Ítem activo</p>
        <p className="mt-1 rounded-md bg-sidebar-accent px-2 py-1">Ítem con hover</p>
      </div>
    </main>
  )
}