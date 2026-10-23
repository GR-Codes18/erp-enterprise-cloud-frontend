import { useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router'
import { useCustomerOptions } from '@/modules/maintenance'
import { ErrorState } from '@/shared/components/ErrorState'
import { Field } from '@/shared/components/Field'
import { RouteFormDialog } from '@/shared/components/RouteFormDialog'
import { QuantityLinesEditor } from '@/shared/components/QuantityLinesEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { getErrorMessage } from '@/shared/lib/api/errors'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { addDays, todayInLima } from '@/shared/lib/dates'
import { despatchHooks } from '../hooks'
import { emptyDespatch, despatchInputSchema, type Despatch, type DespatchInput } from '../schema'

export default function DespatchFormPage() {
  const { id = '' } = useParams()
  const existing = despatchHooks.useDetail(id)

  if (id && existing.isPending) return <p role='status'>Cargando despacho…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== 'draft') return <ErrorState message='Solo se pueden editar despachos en borrador.' />

  return <DespatchForm despatch={existing.data} />
}

function DespatchForm({ despatch }: { despatch?: Despatch }) {
  const navigate = useNavigate()
  const create = despatchHooks.useCreate()
  const update = despatchHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)
  const [customerSearchInput, setCustomerSearchInput] = useState('')
  const customerSearch = useDebouncedValue(customerSearchInput.trim(), 300)

  const customers = useCustomerOptions({ search: customerSearch })
  const customerOptions = (customers.data ?? []).map((c) => ({ id: c.id, label: c.name }))

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<DespatchInput>({
    resolver: zodResolver(despatchInputSchema),
    defaultValues: despatch
      ? { customer_id: despatch.customer_id, items: despatch.items.map(({ product_id, quantity }) => ({ product_id, quantity })), delivery_address: despatch.delivery_address, delivery_date: despatch.delivery_date, notes: despatch.notes }
      : emptyDespatch(addDays(todayInLima(), 7)),
  })

  const { fields, append, remove } = useFieldArray<DespatchInput, 'items'>({ control, name: 'items' })

  const items: DespatchInput['items'] = useWatch({ control, name: 'items' }) ?? []
  const validate = { shouldValidate: isSubmitted, shouldDirty: true }

  const onSubmit = (values: DespatchInput) => {
    setServerError(null)
    const options = { onSuccess: (saved: Despatch) => navigate('/logistics/despatches/' + saved.id), onError: (error: unknown) => setServerError(getErrorMessage(error)) }
    if (despatch) update.mutate({ id: despatch.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <RouteFormDialog
      title={despatch ? 'Editar despacho ' + despatch.number : 'Nuevo despacho de entrega'}
      description='Selecciona un cliente, agrega los productos y define la fecha y dirección de entrega.'
      onClose={() => navigate(despatch ? '/logistics/despatches/' + despatch.id : '/logistics/despatches')}
    >
      {customers.isError && <p role='alert' className='mb-4 text-sm text-danger-text'>{getErrorMessage(customers.error)}</p>}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className='max-w-4xl space-y-6'>
        <QuantityLinesEditor
          title='Productos'
          lines={fields.map((f, i) => ({ key: f.id, product_id: items[i]?.product_id ?? '', quantity: items[i]?.quantity ?? Number.NaN }))}
          products={customerOptions}
          errors={fields.map((_, i) => ({ product_id: errors.items?.[i]?.product_id?.message, quantity: errors.items?.[i]?.quantity?.message }))}
          listError={errors.items?.message ?? errors.items?.root?.message}
          disabled={isPending || customers.isPending}
          onProductChange={(i, v) => setValue(`items.${i}.product_id` as `items.${number}.product_id`, v, validate)}
          onQuantityChange={(i, v) => setValue(`items.${i}.quantity` as `items.${number}.quantity`, v, validate)}
          onAdd={() => append({ product_id: '', quantity: 1 })}
          onRemove={remove}
          onProductSearch={setCustomerSearchInput}
          isLoading={customers.isPending}
          errorMessage={customers.isError ? getErrorMessage(customers.error) : undefined}
        />

        <div className='grid gap-4 md:grid-cols-[12rem_1fr]'>
          <Field id='customer_id' label='Cliente' error={errors.customer_id?.message}>
            <Input id='customer_id' type='text' disabled={isPending} aria-invalid={!!errors.customer_id} aria-describedby={errors.customer_id ? 'customer_id-error' : undefined} {...register('customer_id')} />
          </Field>
          <Field id='delivery_date' label='Fecha de entrega' error={errors.delivery_date?.message}>
            <Input id='delivery_date' type='date' disabled={isPending} aria-invalid={!!errors.delivery_date} aria-describedby={errors.delivery_date ? 'delivery_date-error' : undefined} {...register('delivery_date')} />
          </Field>
        </div>

        <Field id='delivery_address' label='Dirección de entrega' error={errors.delivery_address?.message}>
          <Textarea id='delivery_address' placeholder='Dónde se entregará' disabled={isPending} aria-invalid={!!errors.delivery_address} aria-describedby={errors.delivery_address ? 'delivery_address-error' : undefined} {...register('delivery_address')} />
        </Field>

        <Field id='notes' label='Notas' error={errors.notes?.message}>
          <Textarea id='notes' maxLength={500} placeholder='Observaciones adicionales' disabled={isPending} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'notes-error' : undefined} {...register('notes')} />
        </Field>

        {serverError && <p role='alert' className='rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'>{serverError}</p>}

        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar borrador'}</Button>
          <Button variant='outline' asChild><Link to={despatch ? '/logistics/despatches/' + despatch.id : '/logistics/despatches'}>Cancelar</Link></Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
