import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { useDespatchOptions } from '@/modules/logistics/despatches'
import { ErrorState } from '@/shared/components/ErrorState'
import { Field } from '@/shared/components/Field'
import { RouteFormDialog } from '@/shared/components/RouteFormDialog'
import { QuantityLinesEditor } from '@/shared/components/QuantityLinesEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { getErrorMessage } from '@/shared/lib/api/errors'
import { routeHooks } from '../hooks'
import { emptyRoute, routeInputSchema, type Route, type RouteInput } from '../schema'

export default function RouteFormPage() {
  const { id = '' } = useParams()
  const existing = routeHooks.useDetail(id)

  if (id && existing.isPending) return <p role='status'>Cargando ruta…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== 'draft') return <ErrorState message='Solo se pueden editar rutas en borrador.' />

  return <RouteForm route={existing.data} />
}

function RouteForm({ route }: { route?: Route }) {
  const navigate = useNavigate()
  const create = routeHooks.useCreate()
  const update = routeHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)
  const [despatchSearchInput, setDespatchSearchInput] = useState('')

  const despatches = useDespatchOptions({ search: despatchSearchInput.trim() })
  const despatchOptions = (despatches.data ?? []).map((d) => ({ id: d.id, label: d.number + ' - ' + d.customer_name }))

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<RouteInput>({
    resolver: zodResolver(routeInputSchema),
    defaultValues: route
      ? { name: route.name, start_date: route.start_date, end_date: route.end_date, status: route.status, despatch_ids: route.despatch_ids, notes: route.notes }
      : emptyRoute(),
  })

  const values = watch()
  const fields = (values.despatch_ids ?? []).map((id, index) => ({ id: `despatch-${index}-${id || index}` }))
  const append = (value = '') => setValue('despatch_ids', [...(values.despatch_ids ?? []), value], { shouldValidate: isSubmitted, shouldDirty: true })
  const remove = (index: number) => setValue('despatch_ids', (values.despatch_ids ?? []).filter((_, i) => i !== index), { shouldValidate: isSubmitted, shouldDirty: true })
  const validate = { shouldValidate: isSubmitted, shouldDirty: true }

  const onSubmit = (values: RouteInput) => {
    setServerError(null)
    const options = { onSuccess: (saved: Route) => navigate('/logistics/routes/' + saved.id), onError: (error: unknown) => setServerError(getErrorMessage(error)) }
    if (route) update.mutate({ id: route.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <RouteFormDialog
      title={route ? 'Editar ruta ' + route.number : 'Nueva ruta de distribución'}
      description='Selecciona los despachos que agruparás en esta ruta y define el periodo de ejecución.'
      onClose={() => navigate(route ? '/logistics/routes/' + route.id : '/logistics/routes')}
    >
      {despatches.isError && <p role='alert' className='mb-4 text-sm text-danger-text'>{getErrorMessage(despatches.error)}</p>}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className='max-w-4xl space-y-6'>
        <Field id='name' label='Nombre de la ruta' error={errors.name?.message}>
          <Input id='name' placeholder='Ej. Ruta Sur Línea 01' disabled={isPending} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} {...register('name')} />
        </Field>

        <div className='grid gap-4 md:grid-cols-[12rem_1fr]'>
          <Field id='start_date' label='Fecha de inicio' error={errors.start_date?.message}>
            <Input id='start_date' type='date' disabled={isPending} aria-invalid={!!errors.start_date} aria-describedby={errors.start_date ? 'start_date-error' : undefined} {...register('start_date')} />
          </Field>
          <Field id='end_date' label='Fecha de fin' error={errors.end_date?.message}>
            <Input id='end_date' type='date' disabled={isPending} aria-invalid={!!errors.end_date} aria-describedby={errors.end_date ? 'end_date-error' : undefined} {...register('end_date')} />
          </Field>
        </div>

        <Field id='despatch_ids' label='Despachos de la ruta' error={errors.despatch_ids?.message}>
          <QuantityLinesEditor
            title='Despachos'
            lines={fields.map((field, index) => ({ key: field.id, product_id: values.despatch_ids?.[index] ?? '', quantity: 1 }))}
            products={despatchOptions}
            errors={fields.map((_, index) => ({ product_id: errors.despatch_ids?.[index]?.message }))}
            listError={errors.despatch_ids?.message}
            disabled={isPending || despatches.isPending}
            onProductChange={(index, value) => setValue(`despatch_ids.${index}` as `despatch_ids.${number}`, value, validate)}
            onQuantityChange={() => {}}
            onAdd={() => append('')}
            onRemove={remove}
            onProductSearch={setDespatchSearchInput}
            isLoading={despatches.isPending}
            errorMessage={despatches.isError ? getErrorMessage(despatches.error) : undefined}
          />
        </Field>

        <Field id='notes' label='Notas' error={errors.notes?.message}>
          <Textarea id='notes' maxLength={1000} placeholder='Información adicional sobre la ruta.' disabled={isPending} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'notes-error' : undefined} {...register('notes')} />
        </Field>

        {serverError && <p role='alert' className='rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'>{serverError}</p>}

        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar borrador'}</Button>
          <Button variant='outline' asChild><Link to={route ? '/logistics/routes/' + route.id : '/logistics/routes'}>Cancelar</Link></Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
