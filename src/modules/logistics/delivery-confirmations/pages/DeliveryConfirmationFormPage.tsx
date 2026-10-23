import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { useRouteOptions } from '@/modules/logistics/routes'
import { useDespatchOptions } from '@/modules/logistics/despatches'
import { ErrorState } from '@/shared/components/ErrorState'
import { Field } from '@/shared/components/Field'
import { RouteFormDialog } from '@/shared/components/RouteFormDialog'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { getErrorMessage } from '@/shared/lib/api/errors'
import { zodResolver } from '@hookform/resolvers/zod'
import { deliveryConfirmationHooks } from '../hooks'
import { emptyDeliveryConfirmation, deliveryConfirmationInputSchema, type DeliveryConfirmation, type DeliveryConfirmationInput } from '../schema'

export default function DeliveryConfirmationFormPage() {
  const { id = '' } = useParams()
  const existing = deliveryConfirmationHooks.useDetail(id)

  if (id && existing.isPending) return <p role='status'>Cargando confirmación de entrega…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== 'pending') return <ErrorState message='Solo se pueden editar confirmaciones con estado pendiente.' />

  return <DeliveryConfirmationForm confirmation={existing.data} />
}

function DeliveryConfirmationForm({ confirmation }: { confirmation?: DeliveryConfirmation }) {
  const navigate = useNavigate()
  const create = deliveryConfirmationHooks.useCreate()
  const update = deliveryConfirmationHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)
  const routes = useRouteOptions({ search: '' })
  const despatches = useDespatchOptions({ search: '' })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryConfirmationInput>({
    resolver: zodResolver(deliveryConfirmationInputSchema),
    defaultValues: confirmation
      ? { route_id: confirmation.route_id, dispatch_id: confirmation.dispatch_id, confirmation_code: confirmation.confirmation_code, customer_signature: confirmation.customer_signature, status: confirmation.status, note: confirmation.note, delivered_at: confirmation.delivered_at }
      : emptyDeliveryConfirmation(),
  })

  const onSubmit = (values: DeliveryConfirmationInput) => {
    setServerError(null)
    const options = { onSuccess: (saved: DeliveryConfirmation) => navigate('/logistics/delivery-confirmations/' + saved.id), onError: (error: unknown) => setServerError(getErrorMessage(error)) }
    if (confirmation) update.mutate({ id: confirmation.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <RouteFormDialog
      title={confirmation ? 'Editar confirmación ' + confirmation.number : 'Nueva confirmación de entrega'}
      description='Registra el resultado de la entrega, la firma del cliente y el estado final.'
      onClose={() => navigate(confirmation ? '/logistics/delivery-confirmations/' + confirmation.id : '/logistics/delivery-confirmations')}
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
          <Field id='confirmation_code' label='Código de confirmación' error={errors.confirmation_code?.message}>
            <Input id='confirmation_code' placeholder='Ej. CONF-2026-000003' disabled={isPending} aria-invalid={!!errors.confirmation_code} aria-describedby={errors.confirmation_code ? 'confirmation_code-error' : undefined} {...register('confirmation_code')} />
          </Field>
          <Field id='delivered_at' label='Fecha de entrega' error={errors.delivered_at?.message}>
            <Input id='delivered_at' type='date' disabled={isPending} aria-invalid={!!errors.delivered_at} aria-describedby={errors.delivered_at ? 'delivered_at-error' : undefined} {...register('delivered_at')} />
          </Field>
        </div>

        <Field id='customer_signature' label='Firma del cliente' error={errors.customer_signature?.message}>
          <Input id='customer_signature' placeholder='Nombre o firma del cliente' disabled={isPending} aria-invalid={!!errors.customer_signature} aria-describedby={errors.customer_signature ? 'customer_signature-error' : undefined} {...register('customer_signature')} />
        </Field>

        <Field id='note' label='Nota del resultado' error={errors.note?.message}>
          <Textarea id='note' maxLength={500} placeholder='Observación sobre el resultado de la entrega.' disabled={isPending} aria-invalid={!!errors.note} aria-describedby={errors.note ? 'note-error' : undefined} {...register('note')} />
        </Field>

        {serverError && <p role='alert' className='rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'>{serverError}</p>}

        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar'}</Button>
          <Button variant='outline' asChild><Link to={confirmation ? '/logistics/delivery-confirmations/' + confirmation.id : '/logistics/delivery-confirmations'}>Cancelar</Link></Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
