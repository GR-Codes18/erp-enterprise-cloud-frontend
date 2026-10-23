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
import { routeReturnHooks } from '../hooks'
import { emptyRouteReturn, routeReturnInputSchema, type RouteReturn, type RouteReturnInput } from '../schema'

export default function RouteReturnFormPage() {
  const { id = '' } = useParams()
  const existing = routeReturnHooks.useDetail(id)

  if (id && existing.isPending) return <p role='status'>Cargando devolución…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== 'pending') return <ErrorState message='Solo se pueden editar devoluciones con estado pendiente.' />

  return <RouteReturnForm return={existing.data} />
}

function RouteReturnForm({ return: routeReturn }: { return?: RouteReturn }) {
  const navigate = useNavigate()
  const create = routeReturnHooks.useCreate()
  const update = routeReturnHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const routes = useRouteOptions()
  const despatches = useDespatchOptions()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RouteReturnInput>({
    resolver: zodResolver(routeReturnInputSchema),
    defaultValues: routeReturn
      ? { route_id: routeReturn.route_id, dispatch_id: routeReturn.dispatch_id, type: routeReturn.type, customer_signature: routeReturn.customer_signature, reason: routeReturn.reason, status: routeReturn.status, note: routeReturn.note, returned_at: routeReturn.returned_at }
      : emptyRouteReturn(),
  })

  const onSubmit = (values: RouteReturnInput) => {
    setServerError(null)
    const options = { onSuccess: (saved: RouteReturn) => navigate('/logistics/route-returns/' + saved.id), onError: (error: unknown) => setServerError(getErrorMessage(error)) }
    if (routeReturn) update.mutate({ id: routeReturn.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <RouteFormDialog
      title={routeReturn ? 'Editar devolución ' + routeReturn.number : 'Nueva devolución en ruta'}
      description='Registra una entrega fallida o un retorno durante la ruta.'
      onClose={() => navigate(routeReturn ? '/logistics/route-returns/' + routeReturn.id : '/logistics/route-returns')}
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
          <Field id='type' label='Tipo de devolución' error={errors.type?.message}>
            <Input id='type' placeholder='Ej. crane, parte, todo' disabled={isPending} aria-invalid={!!errors.type} aria-describedby={errors.type ? 'type-error' : undefined} {...register('type')} />
          </Field>
          <Field id='returned_at' label='Fecha de devolución' error={errors.returned_at?.message}>
            <Input id='returned_at' type='date' disabled={isPending} aria-invalid={!!errors.returned_at} aria-describedby={errors.returned_at ? 'returned_at-error' : undefined} {...register('returned_at')} />
          </Field>
        </div>

        <Field id='customer_signature' label='Firma del cliente' error={errors.customer_signature?.message}>
          <Input id='customer_signature' placeholder='Nombre o firma del cliente' disabled={isPending} aria-invalid={!!errors.customer_signature} aria-describedby={errors.customer_signature ? 'customer_signature-error' : undefined} {...register('customer_signature')} />
        </Field>

        <Field id='reason' label='Razón de la devolución' error={errors.reason?.message}>
          <Textarea id='reason' maxLength={500} placeholder='Por qué se devolvió el producto.' disabled={isPending} aria-invalid={!!errors.reason} aria-describedby={errors.reason ? 'reason-error' : undefined} {...register('reason')} />
        </Field>

        <Field id='note' label='Notas' error={errors.note?.message}>
          <Textarea id='note' maxLength={1000} placeholder='Observaciones adicionales.' disabled={isPending} aria-invalid={!!errors.note} aria-describedby={errors.note ? 'note-error' : undefined} {...register('note')} />
        </Field>

        {serverError && <p role='alert' className='rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'>{serverError}</p>}

        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar'}</Button>
          <Button variant='outline' asChild><Link to={routeReturn ? '/logistics/route-returns/' + routeReturn.id : '/logistics/route-returns'}>Cancelar</Link></Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
