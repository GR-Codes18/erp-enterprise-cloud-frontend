import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"
import { useStock } from "@/modules/inventory/stock/hooks"
import { useHasPermission } from "@/modules/auth"
import { useCustomerOptions, useProductOptions, useUpdateCustomerAddress, useWarehouseOptions } from "@/modules/maintenance"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { LineItemsEditor } from "@/shared/components/LineItemsEditor"
import { RouteFormDialog } from "@/shared/components/RouteFormDialog"
import { EntityPickerDialog } from "@/shared/components/EntityPickerDialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { useLineItemsEditor } from "@/shared/hooks/useLineItemsEditor"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { formatMoney } from "@/shared/lib/money"
import { activeOrSelected, withDocumentProducts } from "@/shared/lib/options"
import { useConfirmOrder, useCreateOrder, useOrder, useUpdateOrder } from "../hooks"
import {
  DELIVERY_METHOD_LABELS,
  DELIVERY_METHODS,
  EMPTY_ORDER,
  PAYMENT_CONDITIONS,
  PAYMENT_CONDITION_LABELS,
  SALE_TYPE_LABELS,
  SALE_TYPES,
  orderInputSchema,
  toOrderInput,
  type DeliveryMethod,
  type Order,
  type OrderInput,
  type PaymentCondition,
  type SaleType,
} from "../orders/schema"
import { buildWarehouseOptionsForProduct } from "../quotes/warehouseOptions"

const TOP_FIELDS = new Set([
  "customer_id",
  "buyer_name",
  "buyer_document_type",
  "buyer_document_number",
  "sale_type",
  "delivery_method",
  "payment_condition",
  "credit_days",
  "notes",
])
const ADDRESS_MAX_LENGTH = 250

export default function OrderFormPage() {
  const { id = "" } = useParams()
  const existing = useOrder(id)

  if (id && existing.isPending) return <p role="status">Cargando orden de venta…</p>
  if (id && existing.isError) {
    return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  }
  if (id && existing.data?.status !== "draft") {
    return <ErrorState message="Solo se pueden editar órdenes de venta en borrador." />
  }
  return <OrderForm order={existing.data} />
}

function OrderForm({ order }: { order?: Order }) {
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const confirmOrder = useConfirmOrder()
  const updateCustomerAddress = useUpdateCustomerAddress()
  const canApprove = useHasPermission("sales.orders:approve")
  const canCreateOrders = useHasPermission("sales.orders:create")
  const canEditOrders = useHasPermission("sales.orders:edit")
  const canEditAddress = canCreateOrders || canEditOrders
  const isPending =
    createOrder.isPending || updateOrder.isPending || confirmOrder.isPending || updateCustomerAddress.isPending
  const [serverError, setServerError] = useState<string | null>(null)
  const [deliveryAddressDraft, setDeliveryAddressDraft] = useState<{ customerId: string; address: string } | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<OrderInput | null>(null)
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null)
  const formLocked = isPending || savedDraftId !== null
  const [customerSearchInput, setCustomerSearchInput] = useState("")
  const customerSearch = useDebouncedValue(customerSearchInput.trim(), 300)

  const customers = useCustomerOptions({ includeInactive: true, search: customerSearch })
  const products = useProductOptions()
  const warehouses = useWarehouseOptions({ includeInactive: Boolean(order) })
  const stock = useStock({ page: 1, size: 200, filters: {} })
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

  const [customerId, condition, saleType, deliveryMethod] = useWatch({
    control,
    name: ["customer_id", "payment_condition", "sale_type", "delivery_method"],
  })
  const watchedItems = useWatch({ control, name: "items" }) ?? []
  const uniqueProductIds = Array.from(
    new Set(watchedItems.map((item) => item.product_id).filter(Boolean)),
  )
  const getWarehouseOptions = (productId: string) => {
    const options = buildWarehouseOptionsForProduct(
      productId,
      warehouses.data ?? [],
      stock.data?.items ?? [],
    )
    const previousWarehouses =
      order?.items
        .filter((item) => item.product_id === productId && item.warehouse_id)
        .map((item) => ({ id: item.warehouse_id, name: item.warehouse_name })) ?? []
    const merged = [...options]
    for (const previous of previousWarehouses) {
      if (!merged.some((warehouse) => warehouse.id === previous.id)) merged.push(previous)
    }
    return merged
  }
  const warehouseOptionsByProduct = Object.fromEntries(
    uniqueProductIds.map((productId) => [productId, getWarehouseOptions(productId)]),
  )
  const customer = customers.data?.find((candidate) => candidate.id === customerId)
  const deliveryAddress =
    deliveryAddressDraft?.customerId === customerId ? deliveryAddressDraft.address : customer?.address ?? ""

  const changeCondition = (value: PaymentCondition) => {
    setValue("payment_condition", value, { shouldDirty: true })
    // Al contado no hay plazo; a crédito se propone 30 días (editable)
    setValue("credit_days", value === "credit" ? 30 : 0, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
  }

  const changeSaleType = (value: SaleType) => {
    setValue("sale_type", value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
    setValue("delivery_method", value === "wholesale" ? "shipping" : "none", {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
  }

  const handleProductChange = (index: number, productId: string) => {
    editor.onProductChange(index, productId)
    const productWarehouses = getWarehouseOptions(productId)
    setValue(`items.${index}.warehouse_id`, productWarehouses.length === 1 ? productWarehouses[0].id : "", {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
  }

  const handleError = (error: unknown, message = getErrorMessage(error)) => {
    const fieldErrors = isApiError(error) ? error.fieldErrors.filter((item) => TOP_FIELDS.has(item.field)) : []
    for (const item of fieldErrors) setError(item.field as keyof OrderInput, { message: item.message })
    setServerError(message)
  }

  const validateDeliveryAddress = (values: OrderInput) => {
    if (values.sale_type !== "wholesale" || values.delivery_method !== "shipping") return true
    if (!customerId || !customer) {
      setAddressError("Selecciona un cliente para registrar la dirección de envío.")
      return false
    }
    const address = deliveryAddress.trim()
    if (!address) {
      setAddressError("Ingresa la dirección de envío del cliente.")
      return false
    }
    if (address.length > ADDRESS_MAX_LENGTH) {
      setAddressError(`La dirección no puede superar ${ADDRESS_MAX_LENGTH} caracteres.`)
      return false
    }
    if (!canEditAddress && address !== (customer.address ?? "")) {
      setAddressError("No tienes permiso para actualizar la dirección desde una venta.")
      return false
    }
    setAddressError(null)
    return true
  }

  const persistDeliveryAddress = async (values: OrderInput) => {
    if (
      values.sale_type !== "wholesale" ||
      values.delivery_method !== "shipping" ||
      !customer ||
      deliveryAddress.trim() === (customer.address ?? "")
    ) {
      return false
    }
    await updateCustomerAddress.mutateAsync({ id: customer.id, address: deliveryAddress.trim() })
    return true
  }

  const onSubmit = async (values: OrderInput) => {
    if (!validateDeliveryAddress(values)) return
    setServerError(null)
    setSavedDraftId(null)
    let addressSaved = false
    try {
      addressSaved = await persistDeliveryAddress(values)
      const saved = order
        ? await updateOrder.mutateAsync({ id: order.id, input: values })
        : await createOrder.mutateAsync(values)
      navigate(`/sales/orders/${saved.id}`)
    } catch (error) {
      handleError(
        error,
        addressSaved
          ? `La dirección quedó guardada en el perfil del cliente, pero no se pudo guardar la venta: ${getErrorMessage(error)}`
          : undefined,
      )
    }
  }

  const requestConfirmation = (values: OrderInput) => {
    if (!validateDeliveryAddress(values)) return
    setServerError(null)
    setSavedDraftId(null)
    setPendingValues(values)
    setConfirmationOpen(true)
  }

  const saveAndConfirm = async () => {
    if (!pendingValues) return
    setServerError(null)
    let addressSaved = false
    try {
      addressSaved = await persistDeliveryAddress(pendingValues)
      const saved = order
        ? await updateOrder.mutateAsync({ id: order.id, input: pendingValues })
        : await createOrder.mutateAsync(pendingValues)
      try {
        await confirmOrder.mutateAsync(saved.id)
        navigate(`/sales/orders/${saved.id}`)
      } catch (error) {
        setSavedDraftId(saved.id)
        handleError(
          error,
          `${addressSaved ? "La dirección quedó guardada en el perfil del cliente. " : ""}La orden de venta quedó guardada como borrador, pero no se pudo confirmar: ${getErrorMessage(error)}`,
        )
      }
    } catch (error) {
      handleError(
        error,
        addressSaved
          ? `La dirección quedó guardada en el perfil del cliente, pero no se pudo guardar la venta: ${getErrorMessage(error)}`
          : undefined,
      )
    } finally {
      setConfirmationOpen(false)
      setPendingValues(null)
    }
  }

  const optionsError = customers.isError
    ? customers.error
    : products.isError
      ? products.error
      : warehouses.isError
        ? warehouses.error
        : stock.isError
          ? stock.error
          : null
  const optionsPending = customers.isPending || products.isPending || warehouses.isPending || stock.isPending

  return (
    <RouteFormDialog
      title={order ? `Editar orden de venta ${order.number}` : "Nueva orden de venta"}
      description={
        order?.quote_number
          ? `Creado desde la cotización ${order.quote_number}. Confirmar valida stock y crédito; el inventario se descuenta al emitir el comprobante.`
          : "Confirmar valida stock y crédito. El inventario se descuenta una sola vez al emitir la factura o boleta."
      }
      onClose={() => navigate(order ? `/sales/orders/${order.id}` : "/sales/orders")}
      className="sm:max-w-5xl"
    >
      {optionsError && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(optionsError)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <section className="space-y-4 rounded-xl border bg-card p-4 md:p-5" aria-labelledby="sale-details-title">
          <div>
            <h2 id="sale-details-title" className="font-semibold">Datos de la venta</h2>
            <p className="text-sm text-muted-foreground">
              Elige un cliente registrado o identifica al comprador ocasional y define las condiciones de venta.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          <Field id="customer_id" label="Cliente" error={errors.customer_id?.message}>
            <Controller
              control={control}
              name="customer_id"
              render={({ field }) => (
                <EntityPickerDialog
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    setValue("buyer_name", "", { shouldDirty: true })
                    setValue("buyer_document_type", "", { shouldDirty: true })
                    setValue("buyer_document_number", "", { shouldDirty: true })
                    setCustomerSearchInput("")
                    setAddressError(null)
                  }}
                  options={customerOptions.map((option) => ({
                    value: option.id,
                    label: `${option.name} · ${option.document_type} ${option.document_number}`,
                  }))}
                  placeholder="Selecciona un cliente"
                  searchPlaceholder="Buscar por nombre o documento"
                  allOption={{ value: "", label: "Venta ocasional (sin ficha)" }}
                  disabled={formLocked || customers.isPending}
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
          {!customerId && (
            <div className="space-y-3 rounded-lg border border-dashed p-3 md:col-span-3">
              <div>
                <h3 className="text-sm font-medium">Comprador ocasional</h3>
                <p className="text-xs text-muted-foreground">
                  No se creará una ficha de cliente. Para emitir la boleta, ingresa el nombre o el tipo y número de documento.
                  Esta opción es solo para ventas presenciales al contado.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field id="buyer_name" label="Nombre del comprador" error={errors.buyer_name?.message}>
                  <Input
                    id="buyer_name"
                    autoComplete="name"
                    maxLength={150}
                    placeholder="Nombre (opcional si ingresas documento)"
                    disabled={formLocked}
                    aria-invalid={!!errors.buyer_name}
                    aria-describedby={errors.buyer_name ? "buyer_name-error" : undefined}
                    {...register("buyer_name")}
                  />
                </Field>
                <Field id="buyer_document_type" label="Tipo de documento" error={errors.buyer_document_type?.message}>
                  <Controller
                    control={control}
                    name="buyer_document_type"
                    render={({ field }) => (
                      <Select
                        value={field.value || "none"}
                        onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                        disabled={formLocked}
                      >
                        <SelectTrigger id="buyer_document_type" className="w-full">
                          <SelectValue placeholder="Sin documento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin documento</SelectItem>
                          <SelectItem value="DNI">DNI</SelectItem>
                          <SelectItem value="RUC">RUC</SelectItem>
                          <SelectItem value="CE">Carné de extranjería</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field id="buyer_document_number" label="Número de documento" error={errors.buyer_document_number?.message}>
                  <Input
                    id="buyer_document_number"
                    maxLength={20}
                    placeholder="Número (opcional si ingresas nombre)"
                    disabled={formLocked}
                    aria-invalid={!!errors.buyer_document_number}
                    aria-describedby={errors.buyer_document_number ? "buyer_document_number-error" : undefined}
                    {...register("buyer_document_number")}
                  />
                </Field>
              </div>
            </div>
          )}
          <Field id="sale_type" label="Tipo de venta" error={errors.sale_type?.message}>
            <Controller
              control={control}
              name="sale_type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => changeSaleType(value as SaleType)}
                  disabled={formLocked}
                >
                  <SelectTrigger id="sale_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALE_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {SALE_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="payment_condition" label="Condición de pago">
            <Select value={condition} onValueChange={(value) => changeCondition(value as PaymentCondition)} disabled={formLocked}>
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
                disabled={formLocked}
                aria-invalid={!!errors.credit_days}
                aria-describedby={errors.credit_days ? "credit_days-error" : undefined}
                {...register("credit_days", { valueAsNumber: true })}
              />
            </Field>
          )}
          </div>
        </section>

        {saleType === "wholesale" && (
          <section className="space-y-4 rounded-xl border bg-card p-4 md:p-5" aria-labelledby="delivery-title">
            <div>
              <h2 id="delivery-title" className="font-semibold">Entrega</h2>
              <p className="text-sm text-muted-foreground">Selecciona envío o recojo. Para envío, la dirección se guarda en el perfil del cliente.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
            <Field id="delivery_method" label="Entrega" error={errors.delivery_method?.message}>
              <Controller
                control={control}
                name="delivery_method"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as DeliveryMethod)}
                    disabled={formLocked}
                  >
                    <SelectTrigger id="delivery_method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_METHODS.filter((value) => value !== "none").map((value) => (
                        <SelectItem key={value} value={value}>
                          {DELIVERY_METHOD_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {deliveryMethod === "shipping" && (
              <Field id="delivery_address" label="Dirección de envío del cliente" error={addressError ?? undefined}>
                <Textarea
                  id="delivery_address"
                  value={deliveryAddress}
                  maxLength={ADDRESS_MAX_LENGTH}
                  autoComplete="street-address"
                  placeholder={
                    !customerId
                      ? "Selecciona un cliente para agregar su dirección"
                      : customers.isPending
                        ? "Cargando dirección del cliente…"
                        : "Escribe la dirección principal del cliente"
                  }
                  disabled={formLocked || !canEditAddress || !customer}
                  aria-invalid={!!addressError}
                  aria-describedby={addressError ? "delivery_address-error" : undefined}
                  onChange={(event) => {
                    setDeliveryAddressDraft({ customerId, address: event.target.value })
                    setAddressError(null)
                  }}
                />
              </Field>
            )}
            </div>
          </section>
        )}

        <section className="space-y-3 rounded-xl border bg-card p-4 md:p-5" aria-labelledby="sale-products-title">
          <div>
            <h2 id="sale-products-title" className="font-semibold">Productos y almacén</h2>
            <p className="text-sm text-muted-foreground">
              Los almacenes disponibles corresponden a productos con existencias. El stock se valida de nuevo al confirmar.
            </p>
          </div>
          <LineItemsEditor
            {...editor}
            products={productOptions}
            priceLabel="Precio unitario (S/)"
            disabled={formLocked || products.isPending || warehouses.isPending || stock.isPending}
            warehouseOptionsByProduct={warehouseOptionsByProduct}
            onProductChange={handleProductChange}
            onWarehouseChange={(index, warehouseId) =>
              setValue(`items.${index}.warehouse_id`, warehouseId, {
                shouldDirty: true,
                shouldValidate: form.formState.isSubmitted,
              })
            }
          />
        </section>

        <section className="rounded-xl border bg-card p-4 md:p-5">
          <Field id="notes" label="Notas" error={errors.notes?.message}>
            <Textarea
              id="notes"
              maxLength={500}
              placeholder="Indicaciones de despacho... (opcional)"
              disabled={formLocked}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? "notes-error" : undefined}
              {...register("notes")}
            />
          </Field>
        </section>

        {serverError && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
            {serverError}
          </p>
        )}
        {savedDraftId && (
          <p className="text-sm">
            <Link className="underline" to={`/sales/orders/${savedDraftId}`}>
              Abrir la orden de venta en borrador
            </Link>
          </p>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <Button type="submit" variant="outline" disabled={formLocked || optionsPending || !!optionsError}>
            {isPending ? "Guardando..." : "Guardar borrador"}
          </Button>
          {canApprove && (
            <Button
              type="button"
              variant="secondary"
              disabled={formLocked || optionsPending || !!optionsError}
              onClick={() => void handleSubmit(requestConfirmation)()}
            >
              Guardar y confirmar
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={order ? `/sales/orders/${order.id}` : "/sales/orders"}>Cancelar</Link>
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!isPending) setConfirmationOpen(open)
          if (!open && !isPending) setPendingValues(null)
        }}
        title="Guardar y confirmar orden de venta"
        description="Se guardará la orden de venta y se validarán el cliente, el stock disponible y el límite de crédito."
        confirmText="Guardar y confirmar"
        isLoading={isPending}
        onConfirm={() => void saveAndConfirm()}
      />
    </RouteFormDialog>
  )
}
