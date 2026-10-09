import { useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { useWarehouseOptions } from "@/modules/maintenance"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { QuantityLinesEditor } from "@/shared/components/QuantityLinesEditor"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { activeOrSelected } from "@/shared/lib/options"
import { purchaseOrderHooks, receptionHooks, usePurchaseOrdersByStatus } from "../hooks"
import { canReceive, pendingQuantity } from "../orders/schema"
import { receptionInputSchema, receptionQuantityErrors, type Reception, type ReceptionInput } from "../receptions/schema"

export default function ReceptionFormPage() {
  const { id = "" } = useParams()
  const existing = receptionHooks.useDetail(id)

  if (id && existing.isPending) return <p role="status">Cargando recepción…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== "draft") return <ErrorState message="Solo se pueden editar recepciones en borrador." />
  return <ReceptionForm reception={existing.data} />
}

function ReceptionForm({ reception }: { reception?: Reception }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const create = receptionHooks.useCreate()
  const update = receptionHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  // Órdenes que aún esperan mercadería
  const orders = usePurchaseOrdersByStatus(["issued", "partially_received"])
  const orderOptions = (orders.data ?? []).filter((order) => canReceive(order) || order.id === reception?.order_id)
  const warehouses = useWarehouseOptions({ includeInactive: true })
  const warehouseOptions = activeOrSelected(warehouses.data ?? [], reception ? [reception.warehouse_id] : [])

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<ReceptionInput>({
    resolver: zodResolver(receptionInputSchema),
    defaultValues: reception
      ? {
          order_id: reception.order_id,
          warehouse_id: reception.warehouse_id,
          guide_number: reception.guide_number,
          items: reception.items.map(({ product_id, quantity }) => ({ product_id, quantity })),
        }
      : { order_id: searchParams.get("order") ?? "", warehouse_id: "", guide_number: "", items: [] },
  })
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" })
  const orderId = useWatch({ control, name: "order_id" })
  const items = useWatch({ control, name: "items" }) ?? []
  const order = purchaseOrderHooks.useDetail(orderId)
  const orderLines = order.data?.items ?? []
  const pendingLines = orderLines.filter((line) => pendingQuantity(line) > 0)
  const validate = { shouldValidate: isSubmitted, shouldDirty: true }

  // Al elegir la orden se propone recibir todo lo pendiente (las cantidades se ajustan)
  const proposedFor = useRef(reception?.order_id ?? "")
  useEffect(() => {
    if (!order.data || order.data.id !== orderId || proposedFor.current === orderId) return
    proposedFor.current = orderId
    replace(
      order.data.items
        .filter((line) => pendingQuantity(line) > 0)
        .map((line) => ({ product_id: line.product_id, quantity: pendingQuantity(line) })),
    )
  }, [order.data, orderId, replace])

  const changeOrder = (value: string) => {
    setValue("order_id", value, { shouldDirty: true })
    replace([])
  }

  const onSubmit = (values: ReceptionInput) => {
    setServerError(null)
    // Lo recibido <= pendiente de la orden (el backend vuelve a validar)
    let blocked = false
    receptionQuantityErrors(values.items, orderLines).forEach((message, index) => {
      if (message) {
        setError(`items.${index}.quantity`, { message })
        blocked = true
      }
    })
    if (blocked) return
    const options = {
      onSuccess: (saved: Reception) => navigate(`/purchases/receptions/${saved.id}`),
      onError: (error: unknown) => {
        if (isApiError(error)) {
          for (const item of error.fieldErrors) {
            const match = /^items\.(\d+)\.quantity$/.exec(item.field)
            if (match) setError(`items.${Number(match[1])}.quantity`, { message: item.message })
          }
        }
        setServerError(getErrorMessage(error))
      },
    }
    if (reception) update.mutate({ id: reception.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <>
      <PageHeader
        title={reception ? `Editar recepción ${reception.number}` : "Nueva recepción"}
        description="Registra lo que llegó con su guía de remisión. Solo se recibe lo pendiente de la orden."
      />
      {(orders.isError || warehouses.isError) && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(orders.error ?? warehouses.error)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="order_id" label="Orden de compra" error={errors.order_id?.message}>
            <Select value={orderId || undefined} onValueChange={changeOrder} disabled={isPending || orders.isPending || !!reception}>
              <SelectTrigger
                id="order_id"
                className="w-full"
                aria-invalid={!!errors.order_id}
                aria-describedby={errors.order_id ? "order_id-error" : undefined}
              >
                <SelectValue placeholder="Selecciona la orden" />
              </SelectTrigger>
              <SelectContent>
                {orderOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.number} · {option.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="warehouse_id" label="Almacén" error={errors.warehouse_id?.message}>
            <Controller
              control={control}
              name="warehouse_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange} disabled={isPending || warehouses.isPending}>
                  <SelectTrigger
                    id="warehouse_id"
                    className="w-full"
                    aria-invalid={!!errors.warehouse_id}
                    aria-describedby={errors.warehouse_id ? "warehouse_id-error" : undefined}
                  >
                    <SelectValue placeholder="Selecciona el almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseOptions.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="guide_number" label="Guía de remisión" error={errors.guide_number?.message}>
            <Input
              id="guide_number"
              placeholder="Ej. T001-000123"
              disabled={isPending}
              aria-invalid={!!errors.guide_number}
              aria-describedby={errors.guide_number ? "guide_number-error" : undefined}
              {...register("guide_number")}
            />
          </Field>
        </div>

        {orderId && (
          <QuantityLinesEditor
            title="Productos recibidos"
            lines={fields.map((field, index) => ({
              key: field.id,
              product_id: items[index]?.product_id ?? "",
              quantity: items[index]?.quantity ?? Number.NaN,
            }))}
            products={orderLines.map((line) => ({ id: line.product_id, label: line.product_name }))}
            errors={fields.map((_, index) => ({
              product_id: errors.items?.[index]?.product_id?.message,
              quantity: errors.items?.[index]?.quantity?.message,
            }))}
            listError={errors.items?.message ?? errors.items?.root?.message}
            disabled={isPending || order.isPending}
            emptyMessage={order.data && pendingLines.length === 0 ? "Esta orden ya no tiene productos pendientes." : undefined}
            onProductChange={(index, value) => setValue(`items.${index}.product_id`, value, validate)}
            onQuantityChange={(index, value) => setValue(`items.${index}.quantity`, value, validate)}
            onAdd={() => append({ product_id: "", quantity: 1 })}
            onRemove={remove}
            quantityHint={(index) => {
              const line = orderLines.find((candidate) => candidate.product_id === items[index]?.product_id)
              return line ? `Pedidas ${line.quantity}, pendientes ${pendingQuantity(line)}` : undefined
            }}
          />
        )}

        {serverError && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
            {serverError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar borrador"}
          </Button>
          <Button variant="outline" asChild>
            <Link to={reception ? `/purchases/receptions/${reception.id}` : "/purchases/receptions"}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </>
  )
}
