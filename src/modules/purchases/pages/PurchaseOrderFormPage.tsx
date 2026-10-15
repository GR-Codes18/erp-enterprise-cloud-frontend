import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { useProductOptions, useSupplierOptions } from "@/modules/maintenance"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { LineItemsEditor } from "@/shared/components/LineItemsEditor"
import { RouteFormDialog } from "@/shared/components/RouteFormDialog"
import { SearchableSelect } from "@/shared/components/SearchableSelect"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { useLineItemsEditor } from "@/shared/hooks/useLineItemsEditor"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { addDays, todayInLima } from "@/shared/lib/dates"
import { activeOrSelected, withDocumentProducts } from "@/shared/lib/options"
import { purchaseOrderHooks, requestHooks } from "../hooks"
import {
  emptyPurchaseOrder,
  purchaseOrderInputSchema,
  toPurchaseOrderInput,
  type PurchaseOrder,
  type PurchaseOrderInput,
} from "../orders/schema"
import type { PurchaseRequest } from "../requests/schema"

export default function PurchaseOrderFormPage() {
  const { id = "" } = useParams()
  const [searchParams] = useSearchParams()
  const requestId = id ? "" : (searchParams.get("request") ?? "")
  const existing = purchaseOrderHooks.useDetail(id)
  const request = requestHooks.useDetail(requestId)
  const products = useProductOptions()

  // Desde una solicitud se esperan los productos: sus costos se proponen al abrir el formulario
  if ((id && existing.isPending) || (requestId && (request.isPending || products.isPending))) {
    return <p role="status">Cargando…</p>
  }
  if (id && existing.isError) return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  if (requestId && request.isError) return <ErrorState message={getErrorMessage(request.error)} onRetry={() => void request.refetch()} />
  if (id && existing.data?.status !== "draft") return <ErrorState message="Solo se pueden editar órdenes en borrador." />
  if (requestId && request.data?.status !== "approved") {
    return <ErrorState message="Solo se crea una orden desde una solicitud aprobada." />
  }
  return <PurchaseOrderForm order={existing.data} fromRequest={request.data} />
}

function PurchaseOrderForm({ order, fromRequest }: { order?: PurchaseOrder; fromRequest?: PurchaseRequest }) {
  const navigate = useNavigate()
  const create = purchaseOrderHooks.useCreate()
  const update = purchaseOrderHooks.useUpdate()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)
  const [supplierSearchInput, setSupplierSearchInput] = useState("")
  const supplierSearch = useDebouncedValue(supplierSearchInput.trim(), 300)

  // Regla 4: solo activos para lo nuevo; un borrador antiguo conserva su proveedor o producto inactivo
  const suppliers = useSupplierOptions({ includeInactive: true, search: supplierSearch })
  const products = useProductOptions()
  const supplierOptions = activeOrSelected(suppliers.data ?? [], order ? [order.supplier_id] : [])
  // Incluye los productos de la orden o de la solicitud que hoy estén inactivos, marcados como tales
  const productOptions = withDocumentProducts(products.data ?? [], [...(order?.items ?? []), ...(fromRequest?.items ?? [])])
  const costOf = (productId: string) => products.data?.find((p) => p.id === productId)?.cost_price

  const initial = (): PurchaseOrderInput => {
    if (order) return toPurchaseOrderInput(order)
    const empty = emptyPurchaseOrder(addDays(todayInLima(), 7))
    if (!fromRequest) return empty
    // Desde una solicitud aprobada: sus productos y cantidades, con el costo actual propuesto (editable)
    return {
      ...empty,
      request_id: fromRequest.id,
      items: fromRequest.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: costOf(item.product_id) ?? "",
      })),
    }
  }

  const form = useForm<PurchaseOrderInput>({ resolver: zodResolver(purchaseOrderInputSchema), defaultValues: initial() })
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = form
  const editor = useLineItemsEditor(form, costOf)

  const onSubmit = (values: PurchaseOrderInput) => {
    setServerError(null)
    const options = {
      onSuccess: (saved: PurchaseOrder) => navigate(`/purchases/orders/${saved.id}`),
      onError: (error: unknown) => setServerError(getErrorMessage(error)),
    }
    if (order) update.mutate({ id: order.id, input: values }, options)
    else create.mutate(values, options)
  }

  const optionsError = suppliers.isError ? suppliers.error : products.isError ? products.error : null

  return (
    <RouteFormDialog
      title={order ? `Editar orden ${order.number}` : "Nueva orden de compra"}
      description={
        fromRequest
          ? `Desde la solicitud ${fromRequest.number}. Revisa los costos pactados con el proveedor.`
          : "Solo proveedores y productos activos. El total con IGV es una vista previa."
      }
      onClose={() => navigate(order ? `/purchases/orders/${order.id}` : "/purchases/orders")}
      className="sm:max-w-5xl"
    >
      {optionsError && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(optionsError)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-5xl space-y-6">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <Field id="supplier_id" label="Proveedor" error={errors.supplier_id?.message}>
            <Controller
              control={control}
              name="supplier_id"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={supplierOptions.map((supplier) => ({
                    value: supplier.id,
                    label: `${supplier.name} · ${supplier.document_number}`,
                  }))}
                  placeholder="Selecciona un proveedor"
                  searchPlaceholder="Buscar por nombre o documento"
                  disabled={isPending || suppliers.isPending}
                  onSearchChange={setSupplierSearchInput}
                  isLoading={suppliers.isFetching}
                  errorMessage={suppliers.isError ? getErrorMessage(suppliers.error) : undefined}
                  aria-invalid={!!errors.supplier_id}
                  aria-describedby={errors.supplier_id ? "supplier_id-error" : undefined}
                  aria-label="Proveedor"
                />
              )}
            />
          </Field>
          <Field id="expected_date" label="Entrega esperada" error={errors.expected_date?.message}>
            <Input
              id="expected_date"
              type="date"
              disabled={isPending}
              aria-invalid={!!errors.expected_date}
              aria-describedby={errors.expected_date ? "expected_date-error" : undefined}
              {...register("expected_date")}
            />
          </Field>
        </div>

        <LineItemsEditor
          {...editor}
          products={productOptions}
          priceLabel="Costo unitario (S/)"
          disabled={isPending || products.isPending}
        />

        <Field id="notes" label="Notas" error={errors.notes?.message}>
          <Textarea
            id="notes"
            maxLength={500}
            placeholder="Condiciones pactadas, lugar de entrega... (opcional)"
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
            <Link to={order ? `/purchases/orders/${order.id}` : "/purchases/orders"}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
