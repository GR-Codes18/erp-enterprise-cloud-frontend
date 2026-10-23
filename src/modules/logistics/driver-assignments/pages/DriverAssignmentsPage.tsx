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
import { driverAssignmentHooks } from '../hooks'
import { DRIVER_ASSIGNMENT_STATUS_LABELS, DRIVER_ASSIGNMENT_STATUS_TONES, DRIVER_ASSIGNMENT_STATUSES, type DriverAssignment } from '../schema'

export default function DriverAssignmentsPage() {
  const list = useListFilters(['status', 'date'] as const)
  const assignments = driverAssignmentHooks.useList(list.params)
  const canCreate = useHasPermission('logistics.drivers:create')

  const columns: Column<DriverAssignment>[] = [
    { key: 'number', header: 'Número', cell: (row) => <span className='font-mono text-sm'>{row.number}</span> },
    { key: 'date', header: 'Fecha', cell: (row) => formatDateTimeLima(row.created_at) },
    { key: 'route', header: 'Ruta', cell: (row) => row.route_number },
    { key: 'driver', header: 'Conductor', cell: (row) => row.driver_name },
    { key: 'driver_plate', header: 'Placa', cell: (row) => row.driver_plate },
    { key: 'assigned_by', header: 'Responsable', cell: (row) => row.assigned_by },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge tone={DRIVER_ASSIGNMENT_STATUS_TONES[row.status]} label={DRIVER_ASSIGNMENT_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'detail',
      header: 'Detalle',
      cell: (row) => (
        <Button variant='link' size='sm' asChild>
          <Link to={'/logistics/driver-assignments/' + row.id}>Ver</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && <Button asChild><Link to='/logistics/driver-assignments/new'>Nueva asignación</Link></Button>

  return (
    <ListPageLayout
      title='Asignación de conductores'
      description='Asigna al responsable de conducir cada ruta programada.'
      actions={newButton}
      query={assignments}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: 'Aún no hay conductores asignados', description: 'Crea una asignación para indicar quién conduce cada ruta.', action: newButton }}
      toolbar={
        <>
          <Input type='search' className='max-w-xs' placeholder='Buscar por número, ruta, conductor o responsable' aria-label='Buscar asignaciones de conductores' value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} />
          <FilterSelect label='Filtrar por estado' value={list.values.status} onChange={list.setFilter('status')} allLabel='Todos los estados' options={DRIVER_ASSIGNMENT_STATUSES.map((v) => ({ value: v, label: DRIVER_ASSIGNMENT_STATUS_LABELS[v] }))} className='w-56' />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
