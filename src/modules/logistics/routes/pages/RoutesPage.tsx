import { Link } from 'react-router'
import { useHasPermission } from '@/modules/auth'
import type { Column } from '@/shared/components/DataTable'
import { DateRangeFilter } from '@/shared/components/DateRangeFilter'
import { FilterSelect } from '@/shared/components/FilterSelect'
import { ListPageLayout } from '@/shared/components/ListPageLayout'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { useListFilters } from '@/shared/hooks/useListFilters'
import { formatBusinessDate, formatDateTimeLima } from '@/shared/lib/dates'
import { routeHooks } from '../hooks'
import { ROUTE_STATUSES, ROUTE_STATUS_LABELS, ROUTE_STATUS_TONES, type Route } from '../schema'

export default function RoutesPage() {
  const list = useListFilters(['status', 'date'] as const)
  const routes = routeHooks.useList(list.params)
  const canCreate = useHasPermission('logistics.routes:create')

  const columns: Column<Route>[] = [
    { key: 'number', header: 'Número', cell: (row) => <span className='font-mono text-sm'>{row.number}</span> },
    { key: 'date', header: 'Fecha', cell: (row) => formatDateTimeLima(row.created_at) },
    { key: 'name', header: 'Nombre', cell: (row) => row.name },
    { key: 'start_date', header: 'Inicio', cell: (row) => formatBusinessDate(row.start_date) },
    { key: 'end_date', header: 'Fin', cell: (row) => formatBusinessDate(row.end_date) },
    { key: 'despatches', header: 'Despachos', cell: (row) => row.despatches.length.toString(), className: 'text-right' },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge tone={ROUTE_STATUS_TONES[row.status]} label={ROUTE_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'detail',
      header: 'Detalle',
      cell: (row) => (
        <Button variant='link' size='sm' asChild>
          <Link to={'/logistics/routes/' + row.id}>Ver</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && <Button asChild><Link to='/logistics/routes/new'>Nueva ruta</Link></Button>

  return (
    <ListPageLayout
      title='Programación de rutas'
      description='Agrupa los despachos en rutas para planificar la distribución.'
      actions={newButton}
      query={routes}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: 'Aún no hay rutas programadas', description: 'Crea una ruta para agregar despachos.', action: newButton }}
      toolbar={
        <>
          <Input type='search' className='max-w-xs' placeholder='Buscar por número, nombre o despachos' aria-label='Buscar rutas' value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} />
          <FilterSelect label='Filtrar por estado' value={list.values.status} onChange={list.setFilter('status')} allLabel='Todos los estados' options={ROUTE_STATUSES.map((v) => ({ value: v, label: ROUTE_STATUS_LABELS[v] }))} className='w-56' />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
