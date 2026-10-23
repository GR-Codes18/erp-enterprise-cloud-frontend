import { Link } from 'react-router'
import { useHasPermission } from '@/modules/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import type { ModuleSection } from '@/shared/types/module'

const sections: ModuleSection[] = [
  {
    label: 'Planificación de despachos',
    items: [
      { label: 'Despachos', path: '/logistics/despatches', permission: 'logistics.despatches:view' },
      { label: 'Nuevo despacho', path: '/logistics/despatches/new', permission: 'logistics.despatches:create' },
    ],
  },
  {
    label: 'Programación de rutas',
    items: [
      { label: 'Rutas', path: '/logistics/routes', permission: 'logistics.routes:view' },
      { label: 'Nueva ruta', path: '/logistics/routes/new', permission: 'logistics.routes:create' },
    ],
  },
  {
    label: 'Asignación de vehículos',
    items: [
      { label: 'Vehículos', path: '/logistics/vehicle-assignments', permission: 'logistics.vehicles:view' },
      { label: 'Nueva asignación', path: '/logistics/vehicle-assignments/new', permission: 'logistics.vehicles:create' },
    ],
  },
  {
    label: 'Asignación de conductores',
    items: [
      { label: 'Conductores', path: '/logistics/driver-assignments', permission: 'logistics.drivers:view' },
      { label: 'Nueva asignación', path: '/logistics/driver-assignments/new', permission: 'logistics.drivers:create' },
    ],
  },
  {
    label: 'Seguimiento de entregas',
    items: [
      { label: 'Seguimientos', path: '/logistics/tracking', permission: 'logistics.tracking:view' },
      { label: 'Nuevo avance', path: '/logistics/tracking/new', permission: 'logistics.tracking:create' },
    ],
  },
  {
    label: 'Confirmación de entregas',
    items: [
      { label: 'Confirmaciones', path: '/logistics/delivery-confirmations', permission: 'logistics.confirmations:view' },
      { label: 'Nueva confirmación', path: '/logistics/delivery-confirmations/new', permission: 'logistics.confirmations:create' },
    ],
  },
  {
    label: 'Devoluciones en ruta',
    items: [
      { label: 'Devoluciones', path: '/logistics/route-returns', permission: 'logistics.returns:view' },
      { label: 'Nueva devolución', path: '/logistics/route-returns/new', permission: 'logistics.returns:create' },
    ],
  },
  {
    label: 'Costos y liquidación de ruta',
    items: [
      { label: 'Costos', path: '/logistics/route-costs', permission: 'logistics.costs:view' },
      { label: 'Nuevo costo', path: '/logistics/route-costs/new', permission: 'logistics.costs:create' },
    ],
  },
]

export default function LogisticsPage() {
  const canView = useHasPermission('logistics:view')

  if (!canView) return null

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap gap-3 items-center'>
        <h1 className='text-2xl font-bold'>Logística y transporte</h1>
        <p className='text-muted-foreground'>Módulo de operaciones de distribución y entregas.</p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        {sections.map((section) => (
          <Card key={section.label}>
            <CardHeader>
              <CardTitle className='text-base'>{section.label}</CardTitle>
              <CardDescription>{section.items.length} acciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {section.items.map((item) => {
                  const permission = item.permission ?? 'logistics:view'
                  const canAccess = useHasPermission(permission)
                  return canAccess ? (
                    <Button key={item.path} variant='link' size='sm' asChild>
                      <Link to={item.path}>{item.label}</Link>
                    </Button>
                  ) : null
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
