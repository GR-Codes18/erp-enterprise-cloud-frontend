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
import { deliveryConfirmationHooks } from '../hooks'
import { DELIVERY_CONFIRMATION_STATUSES, DELIVERY_CONFIRMATION_STATUS_LABELS, DELIVERY_CONFIRMATION_STATUS_TONES, type DeliveryConfirmation, type DeliveryConfirmationStatus } from '../schema'

export default function DeliveryConfirmationsPage() {
  const list = useListFilters(['status', 'date'] as const)
  const confirmations = deliveryConfirmationHooks.useList(list.params)
  const canCreate = useHasPermission('logistics.confirmations:create')

  const columns: Column<DeliveryConfirmation>[] = [
    { key: 'number', header: 'Número', cell: (row) => <span className='font-mono text-sm'>{row.number}</span> },
    { key: 'date', header: 'Fecha', cell: (row) => formatDateTimeLima(row.created_at) },
    { key: 'route', header: 'Ruta', cell: (row) => row.route_number },
    { key: 'dispatch', header: 'Despacho', cell: (row) => row.dispatch_number },
    { key: 'customer', header: 'Cliente', cell: (row) => row.customer_name },
    { key: 'code', header: 'Código', cell: (row) => row.confirmation_code },
    { key: 'signature', header: 'Firma', cell: (row) => row.customer_signature },
    { key: 'delivered_at', header: 'Entregado', cell: (row) => formatBusinessDate(row.delivered_at) },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge tone={DELIVERY_CONFIRMATION_STATUS_TONES[row.status]} label={DELIVERY_CONFIRMATION_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'detail',
      header: 'Detalle',
      cell: (row) => (
        <Button variant='link' size='sm' asChild>
          <Link to={'/logistics/delivery-confirmations/' + row.id}>Ver</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && <Button asChild><Link to='/logistics/delivery-confirmations/new'>Nueva confirmación</Link></Button>

  return (
    <ListPageLayout
      title='Confirmación de entregas'
      description='Registra el resultado de la entrega, la firma del cliente y el estado.'
      actions={newButton}
      query={confirmations}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: 'Aún no hay confirmaciones de entregas', description: 'Crea una confirmación para registrar el resultado de una entrega.', action: newButton }}
      toolbar={
        <>
          <Input type='search' className='max-w-xs' placeholder='Buscar por número, ruta, despacho o cedente' aria-label='Buscar confirmaciones' value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} />
          <FilterSelect label='Filtrar por estado' value={list.values.status} onChange={list.setFilter('status')} allLabel='Todos los estados' options={DELIVERY_CONFIRMATION_STATUSES.map((v: DeliveryConfirmationStatus) => ({ value: v, label: DELIVERY_CONFIRMATION_STATUS_LABELS[v] }))} className='w-56' />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
