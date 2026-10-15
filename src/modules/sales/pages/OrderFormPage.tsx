import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"
import { useCustomerOptions, useProductOptions } from "@/modules/maintenance"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { LineItemsEditor } from "@/shared/components/LineItemsEditor"
import { RouteFormDialog } from "@/shared/components/RouteFormDialog"
import { SearchableSelect } from "@/shared/components/SearchableSelect"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { useLineItemsEditor } from "@/shared/hooks/useLineItemsEditor"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { formatMoney } from "@/shared/lib/money"
import { activeOrSelected, withDocumentProducts } from "@/shared/lib/options"
import { useCreateOrder, useOrder, useUpdateOrder } from "../hooks"
import {
  EMPTY_ORDER,
  PAYMENT_CONDITIONS,
  PAYMENT_CONDITION_LABELS,
  orderInputSchema,
  toOrderInput,
  type Order,
  type OrderInput,
  type PaymentCondition,
} from "../orders/schema"

const TOP_FIELDS = new Set(["customer_id", "payment_condition", "credit_days", "notes"])

export default function OrderFormPage() {
  const { id = "" } = useParams()
  const existing = useOrder(id)

  if (id && existing.isPending) return <p role="status">Cargando pedido…</p>
  if (id && existing.isError) {
    return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  }
  if (id && existing.data?.status !== "draft") {
    return <ErrorState message="Solo se pueden editar pedidos en borrador." />
  }
  return <OrderForm order={existing.data} />
}

function OrderForm({ order }: { order?: Order }) {
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const isPending = createOrder.isPending || updateOrder.isPending
  const [serverError, setServerError] = useState<string | null>(null)
  const [customerSearchInput, setCustomerSearchInput] = useState("")
  const customerSearch = useDebouncedValue(customerSearchInput.trim(), 300)

  const customers = useCustomerOptions({ includeInactive: true, search: customerSearch })
  const products = useProductOptions()
  const customerOptions = activeOrSelected(customers.data ?? [], order ? [order.customer_id] : [])
  const productOptions = withDocumentProducts(products.data ?? [], order?.items ?? [])

  const form = useForm<OrderInput>({
    resolver: zodResolver(orderInputSchema),
    defaultValues: order ? toOrderInput(order) : EMPTY_ORDER,
  })
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = form
  const editor = useLineItemsEditor(form, (productId) => products.data?.find((p) => p.id === productId)?.sale_price)

  const [customerId, condition] = useWatch({ control, name: ["customer_id", "payment_condition"] })
  const customer = customers.data?.find((candidate) => candidate.id === customerId)

  const changeCondition = (value: PaymentCondition) => {
    setValue("payment_condition", value, { shouldDirty: true })
    // Al contado no hay plazo; a crédito se propone 30 días (editable)
    setValue("credit_days", value === "credit" ? 30 : 0, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
  }

  const handleError = (error: unknown) => {
    const fieldErrors = isApiError(error) ? error.fieldErrors.filter((item) => TOP_FIELDS.has(item.field)) : []
    for (const item of fieldErrors) setError(item.field as keyof OrderInput, { message: item.message })
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: OrderInput) => {
    setServerError(null)
    const onSuccess = (saved: Order) => navigate(`/sales/orders/${saved.id}`)
    if (order) updateOrder.mutate({ id: order.id, input: values }, { onSuccess, onError: handleError })
    else createOrder.mutate(values, { onSuccess, onError: handleError })
  }

  const optionsError = customers.isError ? customers.error : products.isError ? products.error : null

  return (
    <RouteFormDialog
      title={order ? `Editar pedido ${order.number}` : "Nuevo pedido"}
      description={
        order?.quote_number
          ? `Creado desde la cotización ${order.quote_number}. Al confirmar se validan stock y crédito.`
          : "Al confirmar, el sistema valida el stock disponible y, si es a crédito, el límite del cliente."
      }
      onClose={() => navigate(order ? `/sales/orders/${order.id}` : "/sales/orders")}
      className="sm:max-w-5xl"
    >
      {optionsError && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(optionsError)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="customer_id" label="Cliente" error={errors.customer_id?.message}>
            <Controller
              control={control}
              name="customer_id"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={customerOptions.map((option) => ({
                    value: option.id,
                    label: `${option.name} · ${option.document_type} ${option.document_number}`,
                  }))}
                  placeholder="Selecciona un cliente"
                  searchPlaceholder="Buscar por nombre o documento"
                  disabled={isPending || customers.isPending}
                  onSearchChange={setCustomerSearchInput}
                  isLoading={customers.isFetching}
                  errorMessage={customers.isError ? getErrorMessage(customers.error) : undefined}
                  aria-invalid={!!errors.customer_id}
                  aria-describedby={errors.customer_id ? "customer_id-error" : customer ? "customer-credit" : undefined}
                  aria-label="Cliente"
                />
              )}
            />
            {customer && (
              <p id="customer-credit" className="text-xs text-muted-foreground">
                Límite de crédito: {formatMoney(customer.credit_limit)}
              </p>
            )}
          </Field>
          <Field id="payment_condition" label="Condición de pago">
            <Select value={condition} onValueChange={(value) => changeCondition(value as PaymentCondition)} disabled={isPending}>
              <SelectTrigger id="payment_condition" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_CONDITIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PAYMENT_CONDITION_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {condition === "credit" && (
            <Field id="credit_days" label="Días de crédito" error={errors.credit_days?.message}>
              <Input
                id="credit_days"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                disabled={isPending}
                aria-invalid={!!errors.credit_days}
                aria-describedby={errors.credit_days ? "credit_days-error" : undefined}
                {...register("credit_days", { valueAsNumber: true })}
              />
            </Field>
          )}
        </div>

        <LineItemsEditor {...editor} products={productOptions} priceLabel="Precio unitario (S/)" disabled={isPending || products.isPending} />

        <Field id="notes" label="Notas" error={errors.notes?.message}>
          <Textarea
            id="notes"
            maxLength={500}
            placeholder="Indicaciones de despacho... (opcional)"
            disabled={isPending}
            aria-invalid={!!errors.notes}
            aria-describedby={errors.notes ? "notes-error" : undefined}
            {...register("notes")}
          />
        </Field>

        {serverError && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
            {serverError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending || !!optionsError}>
            {isPending ? "Guardando..." : "Guardar borrador"}
          </Button>
          <Button variant="outline" asChild>
            <Link to={order ? `/sales/orders/${order.id}` : "/sales/orders"}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
