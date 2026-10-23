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
import { formatDateTimeLima } from '@/shared/lib/dates'
import { trackingHooks } from '../hooks'
import { TRACKING_STATUSES, TRACKING_STATUS_LABELS, TRACKING_STATUS_TONES, type Tracking } from '../schema'

export default function TrackingPage() {
  const list = useListFilters(['status', 'date'] as const)
  const trackings = trackingHooks.useList(list.params)
  const canCreate = useHasPermission('logistics.tracking:view')

  const columns: Column<Tracking>[] = [
    { key: 'number', header: 'Número', cell: (row) => <span className='font-mono text-sm'>{row.number}</span> },
    { key: 'date', header: 'Fecha', cell: (row) => formatDateTimeLima(row.created_at) },
    { key: 'route', header: 'Ruta', cell: (row) => row.route_number },
    { key: 'dispatch', header: 'Despacho', cell: (row) => row.dispatch_number },
    { key: 'customer', header: 'Cliente', cell: (row) => row.customer_name },
    { key: 'progress', header: 'Avance', cell: (row) => row.progress + '%', className: 'text-right' },
    { key: 'last_update', header: 'Último avance', cell: (row) => formatDateTimeLima(row.last_update) },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge tone={TRACKING_STATUS_TONES[row.status]} label={TRACKING_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'detail',
      header: 'Detalle',
      cell: (row) => (
        <Button variant='link' size='sm' asChild>
          <Link to={'/logistics/tracking/' + row.id}>Ver</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && <Button asChild><Link to='/logistics/tracking/new'>Nuevo avance</Link></Button>

  return (
    <ListPageLayout
      title='Seguimiento de entregas'
      description='Registra los avances y el estado de cada entrega a lo largo de la ruta.'
      actions={newButton}
      query={trackings}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: 'Aún no hay entregas en seguimiento', description: 'Crea un registro de avance para una entrega.', action: newButton }}
      toolbar={
        <>
          <Input type='search' className='max-w-xs' placeholder='Buscar por número, ruta, despacho o cliente' aria-label='Buscar seguimientos' value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} />
          <FilterSelect label='Filtrar por estado' value={list.values.status} onChange={list.setFilter('status')} allLabel='Todos los estados' options={TRACKING_STATUSES.map((v) => ({ value: v, label: TRACKING_STATUS_LABELS[v] }))} className='w-56' />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
