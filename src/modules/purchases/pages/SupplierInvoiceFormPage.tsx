import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router"
import { useSupplierOptions } from "@/modules/maintenance"
import { Field } from "@/shared/components/Field"
import { RouteFormDialog } from "@/shared/components/RouteFormDialog"
import { SearchableSelect } from "@/shared/components/SearchableSelect"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { isBusinessDate, todayInLima } from "@/shared/lib/dates"
import { previewTotals } from "@/shared/lib/lines"
import { formatCents } from "@/shared/lib/money"
import { purchaseOrderHooks, supplierInvoiceHooks, usePurchaseOrdersByStatus } from "../hooks"
import {
  emptySupplierInvoice,
  proposedDueDate,
  supplierInvoiceInputSchema,
  type SupplierInvoice,
  type SupplierInvoiceInput,
} from "../invoices/schema"

const FIELDS = new Set(["supplier_id", "order_id", "series", "number", "issue_date", "due_date", "total"])

/** Una factura registrada no se edita (se anula y se registra de nuevo): solo hay alta */
export default function SupplierInvoiceFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const create = supplierInvoiceHooks.useCreate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [supplierSearchInput, setSupplierSearchInput] = useState("")
  const supplierSearch = useDebouncedValue(supplierSearchInput.trim(), 300)

  const suppliers = useSupplierOptions({ search: supplierSearch })
  // Desde el detalle de una orden llega ?order=: proveedor, orden y vencimiento quedan propuestos
  const presetOrder = purchaseOrderHooks.useDetail(searchParams.get("order") ?? "").data
  const presetSupplier = suppliers.data?.find((candidate) => candidate.id === presetOrder?.supplier_id)
  const today = todayInLima()

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SupplierInvoiceInput>({
    resolver: zodResolver(supplierInvoiceInputSchema),
    values:
      presetOrder && presetSupplier
        ? {
            ...emptySupplierInvoice(today),
            supplier_id: presetOrder.supplier_id,
            order_id: presetOrder.id,
            due_date: proposedDueDate(today, presetSupplier.credit_days),
          }
        : undefined,
    defaultValues: emptySupplierInvoice(today),
    resetOptions: { keepDirtyValues: true },
  })
  const [supplierId, orderId, issueDate] = useWatch({ control, name: ["supplier_id", "order_id", "issue_date"] })
  const supplier = suppliers.data?.find((candidate) => candidate.id === supplierId)
  // Solo órdenes de ese proveedor que ya recibieron mercadería (filtradas en el servidor)
  const orders = usePurchaseOrdersByStatus(["partially_received", "received"], supplierId)
  const orderOptions = supplierId ? (orders.data ?? []) : []
  const order = orderOptions.find((candidate) => candidate.id === orderId)
  const received = order
    ? previewTotals(order.items.map((item) => ({ quantity: item.received_quantity, unit_price: item.unit_price })))
    : null

  // El vencimiento se propone con el plazo de crédito del proveedor (editable)
  const proposeDueDate = (nextIssueDate: string, creditDays = supplier?.credit_days ?? 0) => {
    if (isBusinessDate(nextIssueDate)) setValue("due_date", proposedDueDate(nextIssueDate, creditDays), { shouldDirty: true })
  }

  const onSubmit = (values: SupplierInvoiceInput) => {
    setServerError(null)
    create.mutate(values, {
      onSuccess: (saved: SupplierInvoice) => navigate(`/purchases/invoices/${saved.id}`),
      onError: (error) => {
        if (isApiError(error)) {
          for (const item of error.fieldErrors) {
            if (FIELDS.has(item.field)) setError(item.field as keyof SupplierInvoiceInput, { message: item.message })
          }
        }
        setServerError(getErrorMessage(error))
      },
    })
  }

  const fieldProps = (name: keyof SupplierInvoiceInput) => ({
    disabled: create.isPending,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  })

  return (
    <RouteFormDialog
      title="Registrar factura de proveedor"
      description="Proveedor + serie + número no se repiten. El vencimiento se propone con el plazo del proveedor."
      onClose={() => navigate("/purchases/invoices")}
      className="sm:max-w-3xl"
    >
      {(suppliers.isError || orders.isError) && (
        <p role="alert" className="mb-4 text-sm text-danger-text">
          {getErrorMessage(suppliers.error ?? orders.error)}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="supplier_id" label="Proveedor" error={errors.supplier_id?.message}>
            <SearchableSelect
              value={supplierId}
              onValueChange={(value) => {
                setValue("supplier_id", value, { shouldDirty: true })
                setValue("order_id", "", { shouldDirty: true })
                proposeDueDate(issueDate, suppliers.data?.find((candidate) => candidate.id === value)?.credit_days)
              }}
              options={(suppliers.data ?? []).map((option) => ({
                value: option.id,
                label: `${option.name} · ${option.document_number} · ${option.credit_days} días de crédito`,
              }))}
              placeholder="Selecciona el proveedor"
              searchPlaceholder="Buscar por nombre o documento"
              disabled={create.isPending || suppliers.isPending}
              onSearchChange={setSupplierSearchInput}
              isLoading={suppliers.isFetching}
              errorMessage={suppliers.isError ? getErrorMessage(suppliers.error) : undefined}
              aria-invalid={!!errors.supplier_id}
              aria-describedby={errors.supplier_id ? "supplier_id-error" : undefined}
              aria-label="Proveedor"
            />
          </Field>
          <Field id="order_id" label="Orden de compra" error={errors.order_id?.message}>
            <Select
              value={orderId || undefined}
              onValueChange={(value) => setValue("order_id", value, { shouldDirty: true })}
              disabled={create.isPending || !supplierId}
            >
              <SelectTrigger id="order_id" className="w-full" {...fieldProps("order_id")}>
                <SelectValue placeholder={supplierId ? "Selecciona la orden" : "Primero elige el proveedor"} />
              </SelectTrigger>
              <SelectContent>
                {orderOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="series" label="Serie" error={errors.series?.message}>
            <Input id="series" placeholder="Ej. F001" maxLength={4} {...fieldProps("series")} {...register("series")} />
          </Field>
          <Field id="number" label="Número" error={errors.number?.message}>
            <Input id="number" inputMode="numeric" placeholder="Ej. 00004521" maxLength={8} {...fieldProps("number")} {...register("number")} />
          </Field>
          <Field id="issue_date" label="Fecha de emisión" error={errors.issue_date?.message}>
            <Input
              id="issue_date"
              type="date"
              {...fieldProps("issue_date")}
              {...register("issue_date", { onChange: (event) => proposeDueDate(event.target.value) })}
            />
          </Field>
          <Field id="due_date" label="Vencimiento" error={errors.due_date?.message}>
            <Input id="due_date" type="date" {...fieldProps("due_date")} {...register("due_date")} />
          </Field>
          <Field id="total" label="Total de la factura con IGV (S/)" error={errors.total?.message}>
            <Input id="total" inputMode="decimal" placeholder="0.00" {...fieldProps("total")} {...register("total")} />
            {received && !errors.total && (
              <p className="text-xs text-muted-foreground">
                Lo recibido según la orden suma {formatCents(received.totalCents)} con IGV. Si el total difiere, el sistema lo
                avisará.
              </p>
            )}
          </Field>
        </div>

        {serverError && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
            {serverError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Registrando..." : "Registrar factura"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/purchases/invoices">Cancelar</Link>
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  )
}
