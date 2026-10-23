import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { useRouteOptions } from '@/modules/logistics/routes'
import { ErrorState } from '@/shared/components/ErrorState'
import { Field } from '@/shared/components/Field'
import { RouteFormDialog } from '@/shared/components/RouteFormDialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { getErrorMessage } from '@/shared/lib/api/errors'
import { driverAssignmentHooks } from '../hooks'
import { emptyDriverAssignment, driverAssignmentInputSchema, type DriverAssignment, type DriverAssignmentInput } from '../schema'

export default function DriverAssignmentFormPage() {
  const { id = '' } = useParams()
  const existing = driverAssignmentHooks.useDetail(id)

  if (id && existing.isPending) return <p role='status'>Cargando asignación de conductor…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== 'draft') return <ErrorState message='Solo se pueden editar asignaciones de conductor en borrador.' />

  return <DriverAssignmentForm assignment={existing.data} />
}

function DriverAssignmentForm({ assignment }: { assignment?: DriverAssignment }) {
  const navigate = useNavigate()
  const create = driverAssignmentHooks.useCreate()
  const update = driverAssignmentHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const routes = useRouteOptions()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DriverAssignmentInput>({
    resolver: zodResolver(driverAssignmentInputSchema),
    defaultValues: assignment
      ? { route_id: assignment.route_id, driver_id: assignment.driver_id, status: assignment.status, assigned_by: assignment.assigned_by, notes: assignment.notes }
      : emptyDriverAssignment(),
  })

  const onSubmit = (values: DriverAssignmentInput) => {
    setServerError(null)
    const options = { onSuccess: (saved: DriverAssignment) => navigate('/logistics/driver-assignments/' + saved.id), onError: (error: unknown) => setServerError(getErrorMessage(error)) }
    if (assignment) update.mutate({ id: assignment.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <RouteFormDialog
      title={assignment ? 'Editar asignación de conductor ' + assignment.number : 'Nueva asignación de conductor'}
      description='Asigna al responsable de conducir una ruta programada y registra quién la supervisa.'
      onClose={() => navigate(assignment ? '/logistics/driver-assignments/' + assignment.id : '/logistics/driver-assignments')}
    >
      {routes.isError && <p role='alert' className='mb-4 text-sm text-danger-text'>{getErrorMessage(routes.error)}</p>}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className='max-w-4xl space-y-6'>
        <Field id='route_id' label='Ruta' error={errors.route_id?.message}>
          <Input id='route_id' type='text' disabled={isPending || routes.isPending} aria-invalid={!!errors.route_id} aria-describedby={errors.route_id ? 'route_id-error' : undefined} placeholder='Selecciona una ruta' {...register('route_id')} />
        </Field>

        <Field id='driver_id' label='Conductor' error={errors.driver_id?.message}>
          <Input id='driver_id' type='text' disabled={isPending} aria-invalid={!!errors.driver_id} aria-describedby={errors.driver_id ? 'driver_id-error' : undefined} placeholder='Selecciona un conductor' {...register('driver_id')} />
        </Field>

        <Field id='assigned_by' label='Responsable que asigna la conducción' error={errors.assigned_by?.message}>
          <Input id='assigned_by' placeholder='Nombre del responsable' disabled={isPending} aria-invalid={!!errors.assigned_by} aria-describedby={errors.assigned_by ? 'assigned_by-error' : undefined} {...register('assigned_by')} />
        </Field>

        <Field id='notes' label='Notas' error={errors.notes?.message}>
          <Textarea id='notes' maxLength={1000} placeholder='Observaciones de la asignación.' disabled={isPending} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'notes-error' : undefined} {...register('notes')} />
        </Field>

        {serverError && <p role='alert' className='rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'>{serverError}</p>}

        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar borrador'}</Button>
          <Button variant='outline' asChild><Link to={assignment ? '/logistics/driver-assignments/' + assignment.id : '/logistics/driver-assignments'}>Cancelar</Link></Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
