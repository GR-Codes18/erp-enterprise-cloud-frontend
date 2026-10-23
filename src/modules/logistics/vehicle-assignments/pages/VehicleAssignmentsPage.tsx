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
import { vehicleAssignmentHooks } from '../hooks'
import { VEHICLE_ASSIGNMENT_STATUSES, VEHICLE_ASSIGNMENT_STATUS_LABELS, VEHICLE_ASSIGNMENT_STATUS_TONES, type VehicleAssignment } from '../schema'

export default function VehicleAssignmentsPage() {
  const list = useListFilters(['status', 'date'] as const)
  const assignments = vehicleAssignmentHooks.useList(list.params)
  const canCreate = useHasPermission('logistics.vehicles:create')

  const columns: Column<VehicleAssignment>[] = [
    { key: 'number', header: 'Número', cell: (row) => <span className='font-mono text-sm'>{row.number}</span> },
    { key: 'date', header: 'Fecha', cell: (row) => formatDateTimeLima(row.created_at) },
    { key: 'route', header: 'Ruta', cell: (row) => row.route_number },
    { key: 'vehicle', header: 'Vehículo', cell: (row) => row.vehicle_plate },
    { key: 'driver', header: 'Conductor', cell: (row) => row.driver_name },
    { key: 'final_odo', header: 'Odométro final', cell: (row) => row.final_odo, className: 'text-right' },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge tone={VEHICLE_ASSIGNMENT_STATUS_TONES[row.status]} label={VEHICLE_ASSIGNMENT_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'detail',
      header: 'Detalle',
      cell: (row) => (
        <Button variant='link' size='sm' asChild>
          <Link to={'/logistics/vehicle-assignments/' + row.id}>Ver</Link>
        </Button>
      ),
    },
  ]

  const newButton = canCreate && <Button asChild><Link to='/logistics/vehicle-assignments/new'>Nueva asignación</Link></Button>

  return (
    <ListPageLayout
      title='Asignación de vehículos'
      description='Asigna la unidad de transporte disponible a cada ruta.'
      actions={newButton}
      query={assignments}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: 'Aún no hay vehículos asignados', description: 'Crea una asignación para vincular un vehículo a una ruta.', action: newButton }}
      toolbar={
        <>
          <Input type='search' className='max-w-xs' placeholder='Buscar por número, ruta, vehículo o conductor' aria-label='Buscar asignaciones de vehículos' value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} />
          <FilterSelect label='Filtrar por estado' value={list.values.status} onChange={list.setFilter('status')} allLabel='Todos los estados' options={VEHICLE_ASSIGNMENT_STATUSES.map((v) => ({ value: v, label: VEHICLE_ASSIGNMENT_STATUS_LABELS[v] }))} className='w-56' />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
