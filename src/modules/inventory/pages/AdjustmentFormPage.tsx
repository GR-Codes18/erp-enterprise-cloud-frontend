import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"
import { useProductOptions, useWarehouseOptions } from "@/modules/maintenance"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { RouteFormDialog } from "@/shared/components/RouteFormDialog"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { activeOrSelected, withDocumentProducts } from "@/shared/lib/options"
import { InventoryLineItems } from "../components/InventoryLineItems"
import { useStockAvailability } from "../stock/hooks"
import { useAdjustment, useCreateAdjustment, useUpdateAdjustment } from "../adjustments/hooks"
import {
  ADJUSTMENT_REASON_LABELS,
  ADJUSTMENT_REASONS,
  EMPTY_ADJUSTMENT,
  adjustmentInputSchema,
  type AdjustmentFormValues,
  type AdjustmentInput,
} from "../adjustments/schema"

function AdjustmentEditor({ adjustmentId }: { adjustmentId?: string }) {
  const existing = useAdjustment(adjustmentId ?? "")
  if (adjustmentId && existing.isPending) return <p role="status">Cargando ajuste…</p>
  if (adjustmentId && existing.isError) {
    return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  }
  if (adjustmentId && existing.data?.status !== "draft") {
    return <ErrorState message="Solo se pueden editar ajustes en borrador." />
  }
  return <AdjustmentForm adjustment={existing.data} />
}

function AdjustmentForm({ adjustment }: { adjustment?: NonNullable<ReturnType<typeof useAdjustment>["data"]> }) {
  const navigate = useNavigate()
  const createAdjustment = useCreateAdjustment()
  const updateAdjustment = useUpdateAdjustment()
  // Regla 4: un borrador antiguo sigue mostrando el producto o almacén que hoy está inactivo
  const products = useProductOptions()
  const warehouses = useWarehouseOptions({ includeInactive: true })
  const productOptions = withDocumentProducts(products.data ?? [], adjustment?.items ?? [])
  const warehouseOptions = activeOrSelected(warehouses.data ?? [], adjustment ? [adjustment.warehouse_id] : [])
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    register,
    formState: { errors },
  } = useForm<AdjustmentFormValues, unknown, AdjustmentInput>({
    resolver: zodResolver(adjustmentInputSchema),
    defaultValues: adjustment
      ? {
          warehouse_id: adjustment.warehouse_id,
          items: adjustment.items.map(({ product_id, direction, quantity }) => ({
            product_id,
            direction,
            quantity,
          })),
          reason: adjustment.reason,
          notes: adjustment.notes,
        }
      : { ...EMPTY_ADJUSTMENT, items: EMPTY_ADJUSTMENT.items.map((item) => ({ ...item })) },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const items = useWatch({ control, name: "items" })
  const warehouseId = useWatch({ control, name: "warehouse_id" })
  const reason = useWatch({ control, name: "reason" })
  const availability = useStockAvailability(warehouseId, items.map((item) => item.product_id))
  const isPending = createAdjustment.isPending || updateAdjustment.isPending

  const onSubmit = (values: AdjustmentInput) => {
    setServerError(null)
    if (availability.error) {
      setServerError(getErrorMessage(availability.error))
      return
    }
    if (availability.isPending) return

    let hasShortage = false
    values.items.forEach((item, index) => {
      const available = availability.quantities[item.product_id] ?? 0
      if (item.direction === "decrease" && item.quantity > available) {
        setError(`items.${index}.quantity`, {
          message: `La cantidad supera las ${available} unidades disponibles en el almacén`,
        })
        hasShortage = true
      }
    })
    if (hasShortage) return

    const onError = (error: unknown) => setServerError(getErrorMessage(error))
    if (adjustment) {
      updateAdjustment.mutate(
        { id: adjustment.id, input: values },
        { onSuccess: () => navigate(`/inventory/adjustments/${adjustment.id}`), onError },
      )
    } else {
      createAdjustment.mutate(values, {
        onSuccess: (created) => navigate(`/inventory/adjustments/${created.id}`),
        onError,
      })
    }
  }

  const itemErrors = fields.map((_, index) => ({
    product_id: errors.items?.[index]?.product_id?.message,
    quantity: errors.items?.[index]?.quantity?.message,
    direction: errors.items?.[index]?.direction?.message,
  }))
  const itemListError = typeof errors.items?.message === "string" ? errors.items.message : undefined
  const optionsError = products.isError
    ? getErrorMessage(products.error)
    : warehouses.isError
      ? getErrorMessage(warehouses.error)
      : undefined

  return (
    <RouteFormDialog
      title={adjustment ? "Editar ajuste" : "Nuevo ajuste"}
      description="Registra aumentos o disminuciones de inventario. Aplicar el ajuste lo hará inmutable."
      onClose={() => navigate(adjustment ? `/inventory/adjustments/${adjustment.id}` : "/inventory/adjustments")}
    >
      {optionsError && <p role="alert" className="mb-4 text-sm text-destructive">{optionsError}</p>}
      {availability.error && <p role="alert" className="mb-4 text-sm text-destructive">{getErrorMessage(availability.error)}</p>}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="warehouse_id" label="Almacén" error={errors.warehouse_id?.message}>
            <Select
              value={warehouseId || undefined}
              onValueChange={(value) => setValue("warehouse_id", value, { shouldValidate: true })}
              disabled={warehouses.isPending || isPending}
            >
              <SelectTrigger id="warehouse_id" className="w-full" aria-invalid={!!errors.warehouse_id}>
                <SelectValue placeholder="Selecciona un almacén" />
              </SelectTrigger>
              <SelectContent>
                {warehouseOptions.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="reason" label="Motivo" error={errors.reason?.message}>
            <Select
              value={reason || undefined}
              onValueChange={(value) => {
                if (ADJUSTMENT_REASONS.includes(value as (typeof ADJUSTMENT_REASONS)[number])) {
                  setValue("reason", value as AdjustmentInput["reason"], { shouldValidate: true })
                }
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="reason"
                className="w-full"
                aria-invalid={!!errors.reason}
                aria-describedby={errors.reason ? "reason-error" : undefined}
              >
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>{ADJUSTMENT_REASON_LABELS[reason]}</SelectItem>
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
          warehouseSelected={warehouseId !== ""}
          mode="adjustment"
          itemErrors={itemErrors}
          listError={itemListError}
          disabled={isPending || products.isPending}
          onProductChange={(index, value) => setValue(`items.${index}.product_id`, value, { shouldValidate: true })}
          onQuantityChange={(index, value) => setValue(`items.${index}.quantity`, value, { shouldValidate: true })}
          onDirectionChange={(index, value) => setValue(`items.${index}.direction`, value, { shouldValidate: true })}
          onAdd={() => append({ product_id: "", direction: "increase", quantity: 1 })}
          onRemove={remove}
        />

        <Field id="notes" label="Notas" error={errors.notes?.message}>
          <Textarea
            id="notes"
            maxLength={500}
            placeholder="Información adicional (opcional)"
            disabled={isPending}
            aria-invalid={!!errors.notes}
            {...register("notes")}
          />
        </Field>

        {serverError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">{serverError}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/inventory/adjustments">Volver</Link>
          </Button>
          <Button type="submit" disabled={isPending || availability.isPending || !!optionsError || !!availability.error}>
            {isPending ? "Guardando…" : "Guardar borrador"}
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}

export default function AdjustmentFormPage() {
  const { id } = useParams()
  return <AdjustmentEditor key={id ?? "new"} adjustmentId={id} />
}
