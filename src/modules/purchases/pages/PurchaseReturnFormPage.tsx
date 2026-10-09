import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { QuantityLinesEditor } from "@/shared/components/QuantityLinesEditor"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { purchaseReturnHooks, receptionHooks } from "../hooks"
import {
  EMPTY_PURCHASE_RETURN,
  purchaseReturnInputSchema,
  purchaseReturnQuantityErrors,
  type PurchaseReturn,
  type PurchaseReturnFormValues,
  type PurchaseReturnInput,
} from "../returns/schema"

export default function PurchaseReturnFormPage() {
  const { id = "" } = useParams()
  const existing = purchaseReturnHooks.useDetail(id)

  if (id && existing.isPending) return <p role="status">Cargando devolución…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== "draft") return <ErrorState message="Solo se pueden editar devoluciones en borrador." />
  return <PurchaseReturnForm purchaseReturn={existing.data} />
}

function PurchaseReturnForm({ purchaseReturn }: { purchaseReturn?: PurchaseReturn }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const create = purchaseReturnHooks.useCreate()
  const update = purchaseReturnHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const receptions = receptionHooks.useList({ page: 1, size: 100, filters: { status: "confirmed" } })

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<PurchaseReturnFormValues, unknown, PurchaseReturnInput>({
    resolver: zodResolver(purchaseReturnInputSchema),
    defaultValues: purchaseReturn
      ? {
          reception_id: purchaseReturn.reception_id,
          items: purchaseReturn.items.map(({ product_id, quantity }) => ({ product_id, quantity })),
          reason: purchaseReturn.reason,
        }
      : { ...EMPTY_PURCHASE_RETURN, reception_id: searchParams.get("reception") ?? "" },
  })
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" })
  const receptionId = useWatch({ control, name: "reception_id" })
  const items = useWatch({ control, name: "items" }) ?? []
  const reception = receptionHooks.useDetail(receptionId)
  const receptionLines = reception.data?.items ?? []
  const validate = { shouldValidate: isSubmitted, shouldDirty: true }

  const onSubmit = (values: PurchaseReturnInput) => {
    setServerError(null)
    let blocked = false
    purchaseReturnQuantityErrors(values.items, receptionLines).forEach((message, index) => {
      if (message) {
        setError(`items.${index}.quantity`, { message })
        blocked = true
      }
    })
    if (blocked) return
    const options = {
      onSuccess: (saved: PurchaseReturn) => navigate(`/purchases/returns/${saved.id}`),
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
    if (purchaseReturn) update.mutate({ id: purchaseReturn.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <>
      <PageHeader
        title={purchaseReturn ? `Editar devolución ${purchaseReturn.number}` : "Nueva devolución al proveedor"}
        description="Solo se devuelve lo recibido menos lo ya devuelto. El motivo es obligatorio."
      />
      {receptions.isError && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(receptions.error)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
        <Field id="reception_id" label="Recepción" error={errors.reception_id?.message}>
          <Select
            value={receptionId || undefined}
            onValueChange={(value) => {
              setValue("reception_id", value, { shouldDirty: true })
              replace([])
            }}
            disabled={isPending || receptions.isPending}
          >
            <SelectTrigger
              id="reception_id"
              className="w-full"
              aria-invalid={!!errors.reception_id}
              aria-describedby={errors.reception_id ? "reception_id-error" : undefined}
            >
              <SelectValue placeholder="Selecciona la recepción confirmada" />
            </SelectTrigger>
            <SelectContent>
              {(receptions.data?.items ?? []).map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.number} · {option.supplier_name} · guía {option.guide_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {receptionId && (
          <QuantityLinesEditor
            title="Productos a devolver"
            lines={fields.map((field, index) => ({
              key: field.id,
              product_id: items[index]?.product_id ?? "",
              quantity: items[index]?.quantity ?? Number.NaN,
            }))}
            products={receptionLines.map((line) => ({ id: line.product_id, label: line.product_name }))}
            errors={fields.map((_, index) => ({
              product_id: errors.items?.[index]?.product_id?.message,
              quantity: errors.items?.[index]?.quantity?.message,
            }))}
            listError={errors.items?.message ?? errors.items?.root?.message}
            disabled={isPending || reception.isPending}
            emptyMessage="Agrega los productos que se devuelven al proveedor."
            onProductChange={(index, value) => setValue(`items.${index}.product_id`, value, validate)}
            onQuantityChange={(index, value) => setValue(`items.${index}.quantity`, value, validate)}
            onAdd={() => append({ product_id: "", quantity: 1 })}
            onRemove={remove}
            quantityHint={(index) => {
              const line = receptionLines.find((candidate) => candidate.product_id === items[index]?.product_id)
              return line
                ? `Recibidas ${line.quantity}, ya devueltas ${line.returned_quantity}: puedes devolver ${Math.max(0, line.quantity - line.returned_quantity)}`
                : undefined
            }}
          />
        )}

        <Field id="reason" label="Motivo" error={errors.reason?.message}>
          <Textarea
            id="reason"
            maxLength={255}
            placeholder="Por qué se devuelve la mercadería"
            disabled={isPending}
            aria-invalid={!!errors.reason}
            aria-describedby={errors.reason ? "reason-error" : undefined}
            {...register("reason")}
          />
        </Field>

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
            <Link to={purchaseReturn ? `/purchases/returns/${purchaseReturn.id}` : "/purchases/returns"}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </>
  )
}
