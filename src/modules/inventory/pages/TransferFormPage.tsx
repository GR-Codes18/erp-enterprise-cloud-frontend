import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"
import { useProductOptions, useWarehouseOptions } from "@/modules/maintenance"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { RouteFormDialog } from "@/shared/components/RouteFormDialog"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { activeOrSelected, withDocumentProducts } from "@/shared/lib/options"
import { useStockAvailability } from "../stock/hooks"
import { InventoryLineItems } from "../components/InventoryLineItems"
import { useCreateTransfer, useTransfer, useUpdateTransfer } from "../transfers/hooks"
import { EMPTY_TRANSFER, transferInputSchema, type TransferInput } from "../transfers/schema"

function TransferEditor({ transferId }: { transferId?: string }) {
  const existing = useTransfer(transferId ?? "")
  if (transferId && existing.isPending) return <p role="status">Cargando transferencia…</p>
  if (transferId && existing.isError) {
    return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  }
  if (transferId && existing.data?.status !== "draft") {
    return <ErrorState message="Solo se pueden editar transferencias en borrador." />
  }
  return <TransferForm transfer={existing.data} />
}

function TransferForm({ transfer }: { transfer?: NonNullable<ReturnType<typeof useTransfer>["data"]> }) {
  const navigate = useNavigate()
  const createTransfer = useCreateTransfer()
  const updateTransfer = useUpdateTransfer()
  // Regla 4: un borrador antiguo sigue mostrando el producto o almacén que hoy está inactivo
  const [productSearchInput, setProductSearchInput] = useState("")
  const productSearch = useDebouncedValue(productSearchInput.trim(), 300)
  const products = useProductOptions({ search: productSearch })
  const warehouses = useWarehouseOptions({ includeInactive: true })
  const productOptions = withDocumentProducts(products.data ?? [], transfer?.items ?? [])
  const warehouseOptions = activeOrSelected(warehouses.data ?? [], transfer ? [transfer.origin_warehouse_id, transfer.destination_warehouse_id] : [])
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<TransferInput>({
    resolver: zodResolver(transferInputSchema),
    defaultValues: transfer
      ? {
          origin_warehouse_id: transfer.origin_warehouse_id,
          destination_warehouse_id: transfer.destination_warehouse_id,
          items: transfer.items.map(({ product_id, quantity }) => ({ product_id, quantity })),
        }
      : { ...EMPTY_TRANSFER, items: EMPTY_TRANSFER.items.map((item) => ({ ...item })) },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const items = useWatch({ control, name: "items" })
  const originId = useWatch({ control, name: "origin_warehouse_id" })
  const destinationId = useWatch({ control, name: "destination_warehouse_id" })
  const availability = useStockAvailability(originId, items.map((item) => item.product_id))
  const isPending = createTransfer.isPending || updateTransfer.isPending

  const onSubmit = (values: TransferInput) => {
    setServerError(null)
    if (availability.error) {
      setServerError(getErrorMessage(availability.error))
      return
    }
    if (availability.isPending) return

    let hasShortage = false
    values.items.forEach((item, index) => {
      const available = availability.quantities[item.product_id] ?? 0
      if (item.quantity > available) {
        setError(`items.${index}.quantity`, {
          message: `La cantidad supera las ${available} unidades disponibles en el almacén de origen`,
        })
        hasShortage = true
      }
    })
    if (hasShortage) return

    const onError = (error: unknown) => setServerError(getErrorMessage(error))
    if (transfer) {
      updateTransfer.mutate(
        { id: transfer.id, input: values },
        { onSuccess: () => navigate(`/inventory/transfers/${transfer.id}`), onError },
      )
    } else {
      createTransfer.mutate(values, {
        onSuccess: (created) => navigate(`/inventory/transfers/${created.id}`),
        onError,
      })
    }
  }

  const itemErrors = fields.map((_, index) => ({
    product_id: errors.items?.[index]?.product_id?.message,
    quantity: errors.items?.[index]?.quantity?.message,
  }))
  const itemListError = typeof errors.items?.message === "string" ? errors.items.message : undefined
  const optionsError = products.isError
    ? getErrorMessage(products.error)
    : warehouses.isError
      ? getErrorMessage(warehouses.error)
      : undefined

  return (
    <RouteFormDialog
      title={transfer ? "Editar transferencia" : "Nueva transferencia"}
      description="Las cantidades se validan contra el stock disponible en el almacén de origen."
      onClose={() => navigate(transfer ? `/inventory/transfers/${transfer.id}` : "/inventory/transfers")}
    >
      {optionsError && <p role="alert" className="mb-4 text-sm text-destructive">{optionsError}</p>}
      {availability.error && <p role="alert" className="mb-4 text-sm text-destructive">{getErrorMessage(availability.error)}</p>}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="origin_warehouse_id" label="Almacén de origen" error={errors.origin_warehouse_id?.message}>
            <Select
              value={originId || undefined}
              onValueChange={(value) => setValue("origin_warehouse_id", value, { shouldValidate: true })}
              disabled={warehouses.isPending || isPending}
            >
              <SelectTrigger id="origin_warehouse_id" className="w-full" aria-invalid={!!errors.origin_warehouse_id}>
                <SelectValue placeholder="Selecciona el origen" />
              </SelectTrigger>
              <SelectContent>
                {warehouseOptions.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="destination_warehouse_id"
            label="Almacén de destino"
            error={errors.destination_warehouse_id?.message}
          >
            <Select
              value={destinationId || undefined}
              onValueChange={(value) => setValue("destination_warehouse_id", value, { shouldValidate: true })}
              disabled={warehouses.isPending || isPending}
            >
              <SelectTrigger id="destination_warehouse_id" className="w-full" aria-invalid={!!errors.destination_warehouse_id}>
                <SelectValue placeholder="Selecciona el destino" />
              </SelectTrigger>
              <SelectContent>
                {warehouseOptions.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <InventoryLineItems
          lines={items}
          products={productOptions}
          availability={availability.quantities}
          availabilityFailed={availability.failed}
          warehouseSelected={originId !== ""}
          mode="transfer"
          itemErrors={itemErrors}
          listError={itemListError}
          disabled={isPending || products.isPending}
          onProductChange={(index, value) => setValue(`items.${index}.product_id`, value, { shouldValidate: true })}
          onQuantityChange={(index, value) => setValue(`items.${index}.quantity`, value, { shouldValidate: true })}
          onDirectionChange={() => undefined}
          onAdd={() => append({ product_id: "", quantity: 1 })}
          onRemove={remove}
          onProductSearch={setProductSearchInput}
          isLoading={products.isPending}
          errorMessage={products.isError ? getErrorMessage(products.error) : undefined}
        />

        {serverError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">{serverError}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/inventory/transfers">Volver</Link>
          </Button>
          <Button type="submit" disabled={isPending || availability.isPending || !!optionsError || !!availability.error}>
            {isPending ? "Guardando…" : "Guardar borrador"}
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}

export default function TransferFormPage() {
  const { id } = useParams()
  return <TransferEditor key={id ?? "new"} transferId={id} />
}
