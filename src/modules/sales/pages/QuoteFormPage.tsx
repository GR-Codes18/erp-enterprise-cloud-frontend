import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"
import { useStock } from "@/modules/inventory/stock/hooks"
import { useCustomerOptions, useProductOptions, useWarehouseOptions } from "@/modules/maintenance"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { LineItemsEditor } from "@/shared/components/LineItemsEditor"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { useLineItemsEditor } from "@/shared/hooks/useLineItemsEditor"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { todayInLima } from "@/shared/lib/dates"
import { activeOrSelected, withDocumentProducts } from "@/shared/lib/options"
import { useCreateQuote, useQuote, useUpdateQuote } from "../hooks"
import { emptyQuote, quoteInputSchema, toQuoteInput, type Quote, type QuoteInput } from "../quotes/schema"

const TOP_FIELDS = new Set(["customer_id", "issue_date", "valid_until", "notes"])

export function buildWarehouseOptionsForProduct(
  productId: string,
  warehouses: Array<{ id: string; name: string }>,
  stockRows: Array<{ product_id: string; warehouse_id: string; quantity: number }> = [],
) {
  if (!productId) return []
  const warehouseIdsWithStock = new Set(
    stockRows
      .filter((row) => row.product_id === productId && row.quantity > 0)
      .map((row) => row.warehouse_id),
  )

  return warehouses.filter((warehouse) => warehouseIdsWithStock.has(warehouse.id))
}

export default function QuoteFormPage() {
  const { id = "" } = useParams()
  const existing = useQuote(id)

  if (id && existing.isPending) return <p role="status">Cargando cotización…</p>
  if (id && existing.isError) {
    return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  }
  // Regla 5: un documento que ya no es borrador no se edita
  if (id && existing.data?.status !== "draft") {
    return <ErrorState message="Solo se pueden editar cotizaciones en borrador." />
  }
  return <QuoteForm quote={existing.data} />
}

function QuoteForm({ quote }: { quote?: Quote }) {
  const navigate = useNavigate()
  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()
  const isPending = createQuote.isPending || updateQuote.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  // Regla 4: solo activos para lo nuevo, pero un borrador antiguo conserva su cliente o producto inactivo
  const customers = useCustomerOptions({ includeInactive: true })
  const products = useProductOptions()
  const warehouses = useWarehouseOptions({ includeInactive: true })
  const stock = useStock({ page: 1, size: 200, filters: {} })
  const customerOptions = activeOrSelected(customers.data ?? [], quote ? [quote.customer_id] : [])
  const productOptions = withDocumentProducts(products.data ?? [], quote?.items ?? [])

  const form = useForm<QuoteInput>({
    resolver: zodResolver(quoteInputSchema),
    defaultValues: quote ? toQuoteInput(quote) : emptyQuote(todayInLima()),
  })
  const {
    control,
    register,
    handleSubmit,    setValue,    setError,
    formState: { errors },
  } = form

  // El precio se propone desde el producto, pero es editable
  const editor = useLineItemsEditor(form, (productId) => products.data?.find((p) => p.id === productId)?.sale_price)
  const watchItems = useWatch({ control, name: "items" }) ?? []
  const uniqueProductIds = Array.from(new Set(watchItems.map((line: { product_id?: string }) => line.product_id).filter(Boolean)))
  const warehouseOptionsByProduct = Object.fromEntries(
    uniqueProductIds.map((productId) => [
      productId,
      buildWarehouseOptionsForProduct(productId, warehouses.data ?? [], stock.data?.items ?? []),
    ]),
  )

  const handleProductChange = (index: number, productId: string) => {
    editor.onProductChange(index, productId)
    const productWarehouses = warehouseOptionsByProduct[productId] ?? []
    setValue(`items.${index}.warehouse_id`, productWarehouses.length === 1 ? productWarehouses[0].id : "", {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
  }

  const handleError = (error: unknown) => {
    const fieldErrors = isApiError(error) ? error.fieldErrors.filter((item) => TOP_FIELDS.has(item.field)) : []
    for (const item of fieldErrors) setError(item.field as keyof QuoteInput, { message: item.message })
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: QuoteInput) => {
    setServerError(null)
    const onSuccess = (saved: Quote) => navigate(`/sales/quotes/${saved.id}`)
    if (quote) updateQuote.mutate({ id: quote.id, input: values }, { onSuccess, onError: handleError })
    else createQuote.mutate(values, { onSuccess, onError: handleError })
  }

  const optionsError = customers.isError ? customers.error : products.isError ? products.error : null

  return (
    <>
      <PageHeader
        title={quote ? `Editar cotización ${quote.number}` : "Nueva cotización"}
        description="Solo clientes y productos activos. El total oficial lo calcula el sistema al guardar."
      />
      {optionsError && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(optionsError)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-5xl space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="customer_id" label="Cliente" error={errors.customer_id?.message}>
            <Controller
              control={control}
              name="customer_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange} disabled={isPending || customers.isPending}>
                  <SelectTrigger
                    id="customer_id"
                    className="w-full"
                    aria-invalid={!!errors.customer_id}
                    aria-describedby={errors.customer_id ? "customer_id-error" : undefined}
                  >
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerOptions.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} · {customer.document_type} {customer.document_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="issue_date" label="Fecha de emisión" error={errors.issue_date?.message}>
            <Input
              id="issue_date"
              type="date"
              disabled={isPending}
              aria-invalid={!!errors.issue_date}
              aria-describedby={errors.issue_date ? "issue_date-error" : undefined}
              {...register("issue_date")}
            />
          </Field>
          <Field id="valid_until" label="Válida hasta" error={errors.valid_until?.message}>
            <Input
              id="valid_until"
              type="date"
              disabled={isPending}
              aria-invalid={!!errors.valid_until}
              aria-describedby={errors.valid_until ? "valid_until-error" : undefined}
              {...register("valid_until")}
            />
          </Field>
        </div>

        <LineItemsEditor
          {...editor}
          products={productOptions}
          warehouseOptionsByProduct={warehouseOptionsByProduct as Record<string, { id: string; name: string }[]>}
          onProductChange={handleProductChange}
          onWarehouseChange={(index, warehouseId) => setValue(`items.${index}.warehouse_id`, warehouseId, {
            shouldDirty: true,
            shouldValidate: form.formState.isSubmitted,
          })}
          priceLabel="Precio unitario (S/)"
          disabled={isPending || products.isPending}
        />

        <Field id="notes" label="Notas" error={errors.notes?.message}>
          <Textarea
            id="notes"
            maxLength={500}
            placeholder="Condiciones de entrega, garantía... (opcional)"
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
            <Link to={quote ? `/sales/quotes/${quote.id}` : "/sales/quotes"}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </>
  )
}
