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
import { routeReturnHooks } from '../hooks'
import { ROUTE_RETURN_STATUSES, ROUTE_RETURN_STATUS_LABELS, ROUTE_RETURN_STATUS_TONES, type RouteReturn } from '../schema'

export default function RouteReturnsPage() {
  const list = useListFilters(['status', 'date'] as const)
  const returns = routeReturnHooks.useList(list.params)
  const canCreate = useHasPermission('logistics.returns:create')

  const columns: Column<RouteReturn>[] = [
    { key: 'number', header: 'Número', cell: (row) => <span className='font-mono text-sm'>{row.number}</span> },
    { key: 'date', header: 'Fecha', cell: (row) => formatDateTimeLima(row.created_at) },
    { key: 'route', header: 'Ruta', cell: (row) => row.route_number },
    { key: 'dispatch', header: 'Despacho', cell: (row) => row.dispatch_number },
    { key: 'customer', header: 'Cliente', cell: (row) => row.customer_name },
    { key: 'type', header: 'Tipo', cell: (row) => row.type },
    { key: 'reason', header: 'Razón', cell: (row) => row.reason },
    { key: 'returned_at', header: 'Devuelto', cell: (row) => formatBusinessDate(row.returned_at) },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge tone={ROUTE_RETURN_STATUS_TONES[row.status]} label={ROUTE_RETURN_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'detail',
      header: 'Detalle',
      cell: (row) => (
        <Button variant='link' size='sm' asChild>
          <Link to={'/logistics/route-returns/' + row.id}>Ver</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && <Button asChild><Link to='/logistics/route-returns/new'>Nueva devolución</Link></Button>

  return (
    <ListPageLayout
      title='Devoluciones en ruta'
      description='Registra entregas fallidas o devoluciones durante la ruta.'
      actions={newButton}
      query={returns}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: 'Aún no hay devoluciones en ruta', description: 'Crea una devolución para registrar un retorno.', action: newButton }}
      toolbar={
        <>
          <Input type='search' className='max-w-xs' placeholder='Buscar por número, ruta, despacho o razón' aria-label='Buscar devoluciones' value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} />
          <FilterSelect label='Filtrar por estado' value={list.values.status} onChange={list.setFilter('status')} allLabel='Todos los estados' options={ROUTE_RETURN_STATUSES.map((v) => ({ value: v, label: ROUTE_RETURN_STATUS_LABELS[v] }))} className='w-56' />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
