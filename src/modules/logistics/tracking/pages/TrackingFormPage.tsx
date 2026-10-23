import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { useDespatchOptions } from '@/modules/logistics/despatches'
import { useRouteOptions } from '@/modules/logistics/routes'
import { ErrorState } from '@/shared/components/ErrorState'
import { Field } from '@/shared/components/Field'
import { RouteFormDialog } from '@/shared/components/RouteFormDialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { getErrorMessage } from '@/shared/lib/api/errors'
import { trackingHooks } from '../hooks'
import { emptyTracking, trackingInputSchema, type Tracking, type TrackingInput } from '../schema'

export default function TrackingFormPage() {
  const { id = '' } = useParams()
  const existing = trackingHooks.useDetail(id)

  if (id && existing.isPending) return <p role='status'>Cargando seguimiento…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== 'pending') return <ErrorState message='Solo se pueden editar seguimientos con estado pendiente.' />

  return <TrackingForm tracking={existing.data} />
}

function TrackingForm({ tracking }: { tracking?: Tracking }) {
  const navigate = useNavigate()
  const create = trackingHooks.useCreate()
  const update = trackingHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const routes = useRouteOptions()
  const despatches = useDespatchOptions()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackingInput>({
    resolver: zodResolver(trackingInputSchema),
    defaultValues: tracking
      ? { route_id: tracking.route_id, dispatch_id: tracking.dispatch_id, progress: tracking.progress, note: tracking.note, status: tracking.status, milestone: tracking.milestone, last_update: tracking.last_update }
      : emptyTracking(),
  })

  const onSubmit = (values: TrackingInput) => {
    setServerError(null)
    const options = { onSuccess: (saved: Tracking) => navigate('/logistics/tracking/' + saved.id), onError: (error: unknown) => setServerError(getErrorMessage(error)) }
    if (tracking) update.mutate({ id: tracking.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <RouteFormDialog
      title={tracking ? 'Editar seguimiento ' + tracking.number : 'Nuevo avance de entrega'}
      description='Registra el estado y el avance de una entrega en una ruta.'
      onClose={() => navigate(tracking ? '/logistics/tracking/' + tracking.id : '/logistics/tracking')}
    >
      {routes.isError && <p role='alert' className='mb-4 text-sm text-danger-text'>{getErrorMessage(routes.error)}</p>}
      {despatches.isError && <p role='alert' className='mb-4 text-sm text-danger-text'>{getErrorMessage(despatches.error)}</p>}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className='max-w-4xl space-y-6'>
        <Field id='route_id' label='Ruta' error={errors.route_id?.message}>
          <Input id='route_id' type='text' disabled={isPending || routes.isPending} aria-invalid={!!errors.route_id} aria-describedby={errors.route_id ? 'route_id-error' : undefined} placeholder='Selecciona una ruta' {...register('route_id')} />
        </Field>

        <Field id='dispatch_id' label='Despacho' error={errors.dispatch_id?.message}>
          <Input id='dispatch_id' type='text' disabled={isPending || despatches.isPending} aria-invalid={!!errors.dispatch_id} aria-describedby={errors.dispatch_id ? 'dispatch_id-error' : undefined} placeholder='Selecciona un despacho' {...register('dispatch_id')} />
        </Field>

        <div className='grid gap-4 md:grid-cols-[12rem_1fr]'>
          <Field id='progress' label='Avance (%)' error={errors.progress?.message}>
            <Input id='progress' type='number' min={0} max={100} disabled={isPending} aria-invalid={!!errors.progress} aria-describedby={errors.progress ? 'progress-error' : undefined} {...register('progress')} />
          </Field>
          <Field id='milestone' label='Fecha del hito' error={errors.milestone?.message}>
            <Input id='milestone' type='date' disabled={isPending} aria-invalid={!!errors.milestone} aria-describedby={errors.milestone ? 'milestone-error' : undefined} {...register('milestone')} />
          </Field>
        </div>

        <Field id='last_update' label='Fecha de la última actualización' error={errors.last_update?.message}>
          <Input id='last_update' type='date' disabled={isPending} aria-invalid={!!errors.last_update} aria-describedby={errors.last_update ? 'last_update-error' : undefined} {...register('last_update')} />
        </Field>

        <Field id='note' label='Observación' error={errors.note?.message}>
          <Textarea id='note' maxLength={500} placeholder='Nota del avance.' disabled={isPending} aria-invalid={!!errors.note} aria-describedby={errors.note ? 'note-error' : undefined} {...register('note')} />
        </Field>

        {serverError && <p role='alert' className='rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'>{serverError}</p>}

        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar'}</Button>
          <Button variant='outline' asChild><Link to={tracking ? '/logistics/tracking/' + tracking.id : '/logistics/tracking'}>Cancelar</Link></Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
