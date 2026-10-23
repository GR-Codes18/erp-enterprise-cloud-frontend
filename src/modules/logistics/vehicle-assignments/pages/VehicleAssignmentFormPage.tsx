import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { useDriverOptions } from '@/modules/logistics/driver-assignments'
import { useRouteOptions } from '@/modules/logistics/routes'
import { ErrorState } from '@/shared/components/ErrorState'
import { Field } from '@/shared/components/Field'
import { RouteFormDialog } from '@/shared/components/RouteFormDialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { getErrorMessage } from '@/shared/lib/api/errors'
import { vehicleAssignmentHooks } from '../hooks'
import { emptyVehicleAssignment, vehicleAssignmentInputSchema, type VehicleAssignment, type VehicleAssignmentInput } from '../schema'

export default function VehicleAssignmentFormPage() {
  const { id = '' } = useParams()
  const existing = vehicleAssignmentHooks.useDetail(id)

  if (id && existing.isPending) return <p role='status'>Cargando asignación de vehículo…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== 'draft') return <ErrorState message='Solo se pueden editar asignaciones de vehículo en borrador.' />

  return <VehicleAssignmentForm assignment={existing.data} />
}

function VehicleAssignmentForm({ assignment }: { assignment?: VehicleAssignment }) {
  const navigate = useNavigate()
  const create = vehicleAssignmentHooks.useCreate()
  const update = vehicleAssignmentHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const routes = useRouteOptions()
  const drivers = useDriverOptions()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleAssignmentInput>({
    resolver: zodResolver(vehicleAssignmentInputSchema),
    defaultValues: assignment
      ? { route_id: assignment.route_id, vehicle_id: assignment.vehicle_id, driver_id: assignment.driver_id, status: assignment.status, final_odo: assignment.final_odo, notes: assignment.notes }
      : emptyVehicleAssignment(),
  })

  const onSubmit = (values: VehicleAssignmentInput) => {
    setServerError(null)
    const options = { onSuccess: (saved: VehicleAssignment) => navigate('/logistics/vehicle-assignments/' + saved.id), onError: (error: unknown) => setServerError(getErrorMessage(error)) }
    if (assignment) update.mutate({ id: assignment.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <RouteFormDialog
      title={assignment ? 'Editar asignación de vehículo ' + assignment.number : 'Nueva asignación de vehículo'}
      description='Vincula un vehículo (unidad de transporte) y un conductor a una ruta programada.'
      onClose={() => navigate(assignment ? '/logistics/vehicle-assignments/' + assignment.id : '/logistics/vehicle-assignments')}
    >
      {routes.isError && <p role='alert' className='mb-4 text-sm text-danger-text'>{getErrorMessage(routes.error)}</p>}
      {drivers.isError && <p role='alert' className='mb-4 text-sm text-danger-text'>{getErrorMessage(drivers.error)}</p>}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className='max-w-4xl space-y-6'>
        <Field id='route_id' label='Ruta' error={errors.route_id?.message}>
          <Input id='route_id' type='text' disabled={isPending || routes.isPending} aria-invalid={!!errors.route_id} aria-describedby={errors.route_id ? 'route_id-error' : undefined} placeholder='Selecciona una ruta' {...register('route_id')} />
        </Field>

        <div className='grid gap-4 md:grid-cols-[12rem_1fr]'>
          <Field id='vehicle_id' label='Unidad de transporte' error={errors.vehicle_id?.message}>
            <Input id='vehicle_id' type='text' disabled={isPending || drivers.isPending} aria-invalid={!!errors.vehicle_id} aria-describedby={errors.vehicle_id ? 'vehicle_id-error' : undefined} placeholder='Selecciona un vehículo' {...register('vehicle_id')} />
          </Field>
          <Field id='driver_id' label='Conductor' error={errors.driver_id?.message}>
            <Input id='driver_id' type='text' disabled={isPending} aria-invalid={!!errors.driver_id} aria-describedby={errors.driver_id ? 'driver_id-error' : undefined} placeholder='Selecciona un conductor' {...register('driver_id')} />
          </Field>
        </div>

        <Field id='final_odo' label='Odométro al final' error={errors.final_odo?.message}>
          <Input id='final_odo' type='number' step='0.1' disabled={isPending} aria-invalid={!!errors.final_odo} aria-describedby={errors.final_odo ? 'final_odo-error' : undefined} {...register('final_odo')} />
        </Field>

        <Field id='notes' label='Notas' error={errors.notes?.message}>
          <Textarea id='notes' maxLength={1000} placeholder='Observaciones del vehículo o ruta.' disabled={isPending} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'notes-error' : undefined} {...register('notes')} />
        </Field>

        {serverError && <p role='alert' className='rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'>{serverError}</p>}

        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar borrador'}</Button>
          <Button variant='outline' asChild><Link to={assignment ? '/logistics/vehicle-assignments/' + assignment.id : '/logistics/vehicle-assignments'}>Cancelar</Link></Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
