import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { RouteFormDialog } from "@/shared/components/RouteFormDialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { formatMoney } from "@/shared/lib/money"
import { useCreateReturn, useInvoice, useInvoicesByStatus, useReturn, useUpdateReturn } from "../hooks"
import { INVOICE_TYPE_LABELS, invoiceCode } from "../invoices/schema"
import {
  EMPTY_RETURN,
  returnInputSchema,
  returnQuantityErrors,
  returnableQuantity,
  type ReturnFormValues,
  type ReturnInput,
  type SalesReturn,
} from "../returns/schema"

export default function ReturnFormPage() {
  const { id = "" } = useParams()
  const existing = useReturn(id)

  if (id && existing.isPending) return <p role="status">Cargando devolución…</p>
  if (id && existing.isError) {
    return <ErrorState message={getErrorMessage(existing.error)} onRetry={() => void existing.refetch()} />
  }
  if (id && existing.data?.status !== "draft") {
    return <ErrorState message="Solo se pueden editar devoluciones en borrador." />
  }
  return <ReturnForm salesReturn={existing.data} />
}

function ReturnForm({ salesReturn }: { salesReturn?: SalesReturn }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const createReturn = useCreateReturn()
  const updateReturn = useUpdateReturn()
  const isPending = createReturn.isPending || updateReturn.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  // Comprobantes vigentes (no anulados) para elegir de cuál se devuelve, filtrados en el servidor
  const invoices = useInvoicesByStatus(["issued", "partially_paid", "paid"])
  const invoiceOptions = invoices.data ?? []

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ReturnFormValues, unknown, ReturnInput>({
    resolver: zodResolver(returnInputSchema),
    defaultValues: salesReturn
      ? {
          invoice_id: salesReturn.invoice_id,
          items: salesReturn.items.map(({ product_id, quantity }) => ({ product_id, quantity })),
          reason: salesReturn.reason,
        }
      : { ...EMPTY_RETURN, invoice_id: searchParams.get("invoice") ?? "" },
  })
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" })
  const invoiceId = useWatch({ control, name: "invoice_id" })
  const items = useWatch({ control, name: "items" }) ?? []
  const invoice = useInvoice(invoiceId)
  const invoiceLines = invoice.data?.items ?? []

  const changeInvoice = (value: string) => {
    setValue("invoice_id", value, { shouldDirty: true })
    // Otro comprobante: sus productos son otros, se empieza de cero
    replace([])
  }

  const onSubmit = (values: ReturnInput) => {
    setServerError(null)
    // Cantidad devuelta <= vendida − ya devuelta (el backend vuelve a validar)
    const quantityErrors = returnQuantityErrors(values.items, invoiceLines)
    let blocked = false
    quantityErrors.forEach((message, index) => {
      if (message) {
        setError(`items.${index}.quantity`, { message })
        blocked = true
      }
    })
    if (blocked) return

    const onSuccess = (saved: SalesReturn) => navigate(`/sales/returns/${saved.id}`)
    const onError = (error: unknown) => {
      if (isApiError(error)) {
        for (const item of error.fieldErrors) {
          const match = /^items\.(\d+)\.quantity$/.exec(item.field)
          if (match) setError(`items.${Number(match[1])}.quantity`, { message: item.message })
        }
      }
      setServerError(getErrorMessage(error))
    }
    if (salesReturn) updateReturn.mutate({ id: salesReturn.id, input: values }, { onSuccess, onError })
    else createReturn.mutate(values, { onSuccess, onError })
  }

  const listError = typeof errors.items?.message === "string" ? errors.items.message : errors.items?.root?.message

  return (
    <RouteFormDialog
      title={salesReturn ? `Editar devolución ${salesReturn.number}` : "Nueva devolución"}
      description="Solo se devuelve lo vendido menos lo ya devuelto. El motivo es obligatorio."
      onClose={() => navigate(salesReturn ? `/sales/returns/${salesReturn.id}` : "/sales/returns")}
    >
      {invoices.isError && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(invoices.error)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
        <Field id="invoice_id" label="Comprobante" error={errors.invoice_id?.message}>
          <Select value={invoiceId || undefined} onValueChange={changeInvoice} disabled={isPending || invoices.isPending}>
            <SelectTrigger
              id="invoice_id"
              className="w-full"
              aria-invalid={!!errors.invoice_id}
              aria-describedby={errors.invoice_id ? "invoice_id-error" : undefined}
            >
              <SelectValue placeholder="Selecciona el comprobante" />
            </SelectTrigger>
            <SelectContent>
              {invoiceOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {INVOICE_TYPE_LABELS[option.type]} {invoiceCode(option)} · {option.customer_name} · {formatMoney(option.total)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {invoiceId && (
          <section className="space-y-3" aria-labelledby="return-lines-title">
            <div className="flex items-center justify-between">
              <h2 id="return-lines-title" className="text-base font-medium">
                Productos a devolver
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || invoice.isPending || fields.length >= invoiceLines.length}
                onClick={() => append({ product_id: "", quantity: 1 })}
              >
                <Plus aria-hidden="true" />
                Agregar producto
              </Button>
            </div>
            {invoice.isError && <ErrorState message={getErrorMessage(invoice.error)} onRetry={() => void invoice.refetch()} />}
            {listError && (
              <p role="alert" className="text-sm text-danger-text">
                {listError}
              </p>
            )}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">Agrega los productos que el cliente devuelve.</p>
            )}

            {fields.map((field, index) => {
              const productId = items[index]?.product_id ?? ""
              const line = invoiceLines.find((candidate) => candidate.product_id === productId)
              const lineErrors = errors.items?.[index]
              const ids = { product: `return-${index}-product`, quantity: `return-${index}-quantity` }
              return (
                <div key={field.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(14rem,3fr)_minmax(8rem,1fr)_auto]">
                  <Field id={ids.product} label="Producto" error={lineErrors?.product_id?.message}>
                    <Select
                      value={productId || undefined}
                      onValueChange={(value) => setValue(`items.${index}.product_id`, value, { shouldDirty: true })}
                      disabled={isPending}
                    >
                      <SelectTrigger id={ids.product} className="w-full" aria-invalid={!!lineErrors?.product_id}>
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceLines.map((option) => (
                          <SelectItem key={option.product_id} value={option.product_id}>
                            {option.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id={ids.quantity} label="Cantidad" error={lineErrors?.quantity?.message}>
                    <Input
                      id={ids.quantity}
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      disabled={isPending}
                      aria-invalid={!!lineErrors?.quantity}
                      aria-describedby={lineErrors?.quantity ? `${ids.quantity}-error` : `${ids.quantity}-hint`}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    {line && !lineErrors?.quantity && (
                      <p id={`${ids.quantity}-hint`} className="text-xs text-muted-foreground">
                        Vendidas {line.quantity}, ya devueltas {line.returned_quantity}: puedes devolver {returnableQuantity(line)}
                      </p>
                    )}
                  </Field>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar producto ${index + 1}`}
                      disabled={isPending}
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        <Field id="reason" label="Motivo" error={errors.reason?.message}>
          <Textarea
            id="reason"
            maxLength={255}
            placeholder="Por qué se devuelven los productos (lo revisa la auditoría)"
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
            <Link to={salesReturn ? `/sales/returns/${salesReturn.id}` : "/sales/returns"}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
