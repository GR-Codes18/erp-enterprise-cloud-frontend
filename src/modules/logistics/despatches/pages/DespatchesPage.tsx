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
import { despatchHooks } from '../hooks'
import { DESPATCH_STATUSES, DESPATCH_STATUS_LABELS, DESPATCH_STATUS_TONES, type Despatch } from '../schema'

export default function DespatchesPage() {
  const list = useListFilters(['status', 'date'] as const)
  const despatches = despatchHooks.useList(list.params)
  const canCreate = useHasPermission('logistics.despatches:create')

  const columns: Column<Despatch>[] = [
    { key: 'number', header: 'Número', cell: (row) => <span className='font-mono text-sm'>{row.number}</span> },
    { key: 'date', header: 'Fecha', cell: (row) => formatDateTimeLima(row.created_at) },
    { key: 'customer', header: 'Cliente', cell: (row) => row.customer_name },
    { key: 'delivery_date', header: 'Entrega', cell: (row) => formatBusinessDate(row.delivery_date) },
    { key: 'items', header: 'Productos', cell: (row) => row.items.length.toString(), className: 'text-right' },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge tone={DESPATCH_STATUS_TONES[row.status]} label={DESPATCH_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'detail',
      header: 'Detalle',
      cell: (row) => (
        <Button variant='link' size='sm' asChild>
          <Link to={'/logistics/despatches/' + row.id}>Ver</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && <Button asChild><Link to='/logistics/despatches/new'>Nueva entrega</Link></Button>

  return (
    <ListPageLayout
      title='Planificación de despachos'
      description='Prepara y agrupa las entregas que se realizarán.'
      actions={newButton}
      query={despatches}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: 'Aún no hay despachos', description: 'Crea la primera entrega para comenzar.', action: newButton }}
      toolbar={
        <>
          <Input type='search' className='max-w-xs' placeholder='Buscar por número, cliente o dirección' aria-label='Buscar despachos' value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} />
          <FilterSelect label='Filtrar por estado' value={list.values.status} onChange={list.setFilter('status')} allLabel='Todos los estados' options={DESPATCH_STATUSES.map((v) => ({ value: v, label: DESPATCH_STATUS_LABELS[v] }))} className='w-56' />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
