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
import { routeCostHooks } from '../hooks'
import { ROUTE_COST_STATUSES, ROUTE_COST_STATUS_LABELS, ROUTE_COST_STATUS_TONES, type RouteCost } from '../schema'
import { money } from '@/shared/lib/money'

export default function RouteCostsPage() {
  const list = useListFilters(['status', 'date'] as const)
  const costs = routeCostHooks.useList(list.params)
  const canCreate = useHasPermission('logistics.costs:create')

  const columns: Column<RouteCost>[] = [
    { key: 'number', header: 'Número', cell: (row) => <span className='font-mono text-sm'>{row.number}</span> },
    { key: 'date', header: 'Fecha', cell: (row) => formatDateTimeLima(row.created_at) },
    { key: 'route', header: 'Ruta', cell: (row) => row.route_number },
    { key: 'description', header: 'Descripción', cell: (row) => row.description },
    { key: 'category', header: 'Categoría', cell: (row) => row.category },
    { key: 'amount', header: 'Monto', cell: (row) => money(row.amount_cents), className: 'text-right' },
    { key: 'paid_by', header: 'Pagó', cell: (row) => row.paid_by },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge tone={ROUTE_COST_STATUS_TONES[row.status]} label={ROUTE_COST_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'detail',
      header: 'Detalle',
      cell: (row) => (
        <Button variant='link' size='sm' asChild>
          <Link to={'/logistics/route-costs/' + row.id}>Ver</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && <Button asChild><Link to='/logistics/route-costs/new'>Nuevo costo</Link></Button>

  return (
    <ListPageLayout
      title='Costos y liquidación de ruta'
      description='Controla los gastos de distribución de cada ruta y su liquidación.'
      actions={newButton}
      query={costs}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: 'Aún no hay costos registrados', description: 'Crea un costo para registrar un gasto de distribución.', action: newButton }}
      toolbar={
        <>
          <Input type='search' className='max-w-xs' placeholder='Buscar por número, ruta, descripción o categoría' aria-label='Buscar costos' value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} />
          <FilterSelect label='Filtrar por estado' value={list.values.status} onChange={list.setFilter('status')} allLabel='Todos los estados' options={ROUTE_COST_STATUSES.map((v) => ({ value: v, label: ROUTE_COST_STATUS_LABELS[v] }))} className='w-56' />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
