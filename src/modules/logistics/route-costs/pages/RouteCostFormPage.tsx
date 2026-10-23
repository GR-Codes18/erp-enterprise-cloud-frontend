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
import { routeCostHooks } from '../hooks'
import { emptyRouteCost, routeCostInputSchema, type RouteCost, type RouteCostInput } from '../schema'

export default function RouteCostFormPage() {
  const { id = '' } = useParams()
  const existing = routeCostHooks.useDetail(id)

  if (id && existing.isPending) return <p role='status'>Cargando costo de ruta…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== 'draft') return <ErrorState message='Solo se pueden editar costos de ruta en borrador.' />

  return <RouteCostForm cost={existing.data} />
}

function RouteCostForm({ cost }: { cost?: RouteCost }) {
  const navigate = useNavigate()
  const create = routeCostHooks.useCreate()
  const update = routeCostHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const routes = useRouteOptions()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RouteCostInput>({
    resolver: zodResolver(routeCostInputSchema),
    defaultValues: cost
      ? { route_id: cost.route_id, description: cost.description, category: cost.category, amount_cents: cost.amount_cents, paid_by: cost.paid_by, status: cost.status, note: cost.note }
      : emptyRouteCost(),
  })

  const onSubmit = (values: RouteCostInput) => {
    setServerError(null)
    const options = { onSuccess: (saved: RouteCost) => navigate('/logistics/route-costs/' + saved.id), onError: (error: unknown) => setServerError(getErrorMessage(error)) }
    if (cost) update.mutate({ id: cost.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <RouteFormDialog
      title={cost ? 'Editar costo de ruta ' + cost.number : 'Nuevo costo de ruta'}
      description='Registra un gasto de distribución y controla su estado hasta la liquidación.'
      onClose={() => navigate(cost ? '/logistics/route-costs/' + cost.id : '/logistics/route-costs')}
    >
      {routes.isError && <p role='alert' className='mb-4 text-sm text-danger-text'>{getErrorMessage(routes.error)}</p>}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className='max-w-4xl space-y-6'>
        <Field id='route_id' label='Ruta' error={errors.route_id?.message}>
          <Input id='route_id' type='text' disabled={isPending || routes.isPending} aria-invalid={!!errors.route_id} aria-describedby={errors.route_id ? 'route_id-error' : undefined} placeholder='Selecciona una ruta' {...register('route_id')} />
        </Field>

        <div className='grid gap-4 md:grid-cols-[12rem_1fr]'>
          <Field id='description' label='Descripción del gasto' error={errors.description?.message}>
            <Input id='description' placeholder='Ej. Combustible para la ruta sur.' disabled={isPending} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'description-error' : undefined} {...register('description')} />
          </Field>
          <Field id='category' label='Categoría' error={errors.category?.message}>
            <Input id='category' placeholder='Ej. Combustible, Repuestos' disabled={isPending} aria-invalid={!!errors.category} aria-describedby={errors.category ? 'category-error' : undefined} {...register('category')} />
          </Field>
        </div>

        <Field id='amount_cents' label='Monto (PEN)' error={errors.amount_cents?.message}>
          <Input id='amount_cents' type='text' inputMode='decimal' disabled={isPending} aria-invalid={!!errors.amount_cents} aria-describedby={errors.amount_cents ? 'amount_cents-error' : undefined} {...register('amount_cents', { valueAsNumber: true })} />
        </Field>

        <Field id='paid_by' label='Quién pagó' error={errors.paid_by?.message}>
          <Input id='paid_by' placeholder='Ej. Soporte Logística' disabled={isPending} aria-invalid={!!errors.paid_by} aria-describedby={errors.paid_by ? 'paid_by-error' : undefined} {...register('paid_by')} />
        </Field>

        <Field id='note' label='Notas' error={errors.note?.message}>
          <Textarea id='note' maxLength={1000} placeholder='Observaciones adicionales.' disabled={isPending} aria-invalid={!!errors.note} aria-describedby={errors.note ? 'note-error' : undefined} {...register('note')} />
        </Field>

        {serverError && <p role='alert' className='rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'>{serverError}</p>}

        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar borrador'}</Button>
          <Button variant='outline' asChild><Link to={cost ? '/logistics/route-costs/' + cost.id : '/logistics/route-costs'}>Cancelar</Link></Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
