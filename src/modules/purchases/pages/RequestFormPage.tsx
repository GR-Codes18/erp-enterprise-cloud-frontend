import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"
import { useProductOptions } from "@/modules/maintenance"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { QuantityLinesEditor } from "@/shared/components/QuantityLinesEditor"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { addDays, todayInLima } from "@/shared/lib/dates"
import { withDocumentProducts } from "@/shared/lib/options"
import { requestHooks } from "../hooks"
import { emptyRequest, requestInputSchema, type PurchaseRequest, type RequestInput } from "../requests/schema"

export default function RequestFormPage() {
  const { id = "" } = useParams()
  const existing = requestHooks.useDetail(id)

  if (id && existing.isPending) return <p role="status">Cargando solicitud…</p>
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (id && existing.data?.status !== "draft") return <ErrorState message="Solo se pueden editar solicitudes en borrador." />
  return <RequestForm request={existing.data} />
}

function RequestForm({ request }: { request?: PurchaseRequest }) {
  const navigate = useNavigate()
  const create = requestHooks.useCreate()
  const update = requestHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const products = useProductOptions()
  const productOptions = withDocumentProducts(products.data ?? [], request?.items ?? []).map(
    (product) => ({ id: product.id, label: `${product.sku} · ${product.name}` }),
  )

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<RequestInput>({
    resolver: zodResolver(requestInputSchema),
    defaultValues: request
      ? { items: request.items.map(({ product_id, quantity }) => ({ product_id, quantity })), justification: request.justification, needed_by: request.needed_by }
      : emptyRequest(addDays(todayInLima(), 7)),
  })
  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const items = useWatch({ control, name: "items" }) ?? []
  const validate = { shouldValidate: isSubmitted, shouldDirty: true }

  const onSubmit = (values: RequestInput) => {
    setServerError(null)
    const options = {
      onSuccess: (saved: PurchaseRequest) => navigate(`/purchases/requests/${saved.id}`),
      onError: (error: unknown) => setServerError(getErrorMessage(error)),
    }
    if (request) update.mutate({ id: request.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <>
      <PageHeader
        title={request ? `Editar solicitud ${request.number}` : "Nueva solicitud de compra"}
        description="Indica qué se necesita, para cuándo y por qué. Luego envíala a aprobación."
      />
      {products.isError && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(products.error)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
        <QuantityLinesEditor
          title="Productos solicitados"
          lines={fields.map((field, index) => ({
            key: field.id,
            product_id: items[index]?.product_id ?? "",
            quantity: items[index]?.quantity ?? Number.NaN,
          }))}
          products={productOptions}
          errors={fields.map((_, index) => ({
            product_id: errors.items?.[index]?.product_id?.message,
            quantity: errors.items?.[index]?.quantity?.message,
          }))}
          listError={errors.items?.message ?? errors.items?.root?.message}
          disabled={isPending || products.isPending}
          onProductChange={(index, value) => setValue(`items.${index}.product_id`, value, validate)}
          onQuantityChange={(index, value) => setValue(`items.${index}.quantity`, value, validate)}
          onAdd={() => append({ product_id: "", quantity: 1 })}
          onRemove={remove}
        />

        <div className="grid gap-4 md:grid-cols-[12rem_1fr]">
          <Field id="needed_by" label="Se necesita para" error={errors.needed_by?.message}>
            <Input
              id="needed_by"
              type="date"
              disabled={isPending}
              aria-invalid={!!errors.needed_by}
              aria-describedby={errors.needed_by ? "needed_by-error" : undefined}
              {...register("needed_by")}
            />
          </Field>
          <Field id="justification" label="Justificación" error={errors.justification?.message}>
            <Textarea
              id="justification"
              maxLength={500}
              placeholder="Para qué se necesita la compra"
              disabled={isPending}
              aria-invalid={!!errors.justification}
              aria-describedby={errors.justification ? "justification-error" : undefined}
              {...register("justification")}
            />
          </Field>
        </div>

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
            <Link to={request ? `/purchases/requests/${request.id}` : "/purchases/requests"}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </>
  )
}
