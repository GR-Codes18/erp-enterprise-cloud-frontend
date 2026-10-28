import { useDeferredValue, useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type Resolver } from "react-hook-form"
import { useSupplierInvoiceOptions } from "@/modules/purchases"
import { useSalesInvoiceOptions } from "@/modules/sales"
import { useCustomerOptions, useMasterCatalogOptions, useSupplierOptions } from "@/modules/maintenance"
import { EntityPickerDialog } from "@/shared/components/EntityPickerDialog"
import { Field } from "@/shared/components/Field"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { todayInLima } from "@/shared/lib/dates"
import { formatMoney, fromCents, toCents } from "@/shared/lib/money"
import { bankAccountLabel } from "../banks/schema"
import { useBankAccountOptions, useCreatePayment } from "../hooks"
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  emptyPayment,
  paymentInputSchema,
  type PaymentInput,
  type PaymentType,
} from "../payments/schema"

interface PaymentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: PaymentType
  /** Documento ya elegido (desde la cuenta por cobrar o pagar), con su saldo vigente */
  document?: PaymentDocument
}

export interface PaymentDocument {
  id: string
  label: string
  balance: string
  partyId?: string
}

const FIELDS = ["method", "payment_date", "bank_account_id", "operation_number", "reference"] as const

function PaymentForm({ type, document, onDone }: { type: PaymentType; document?: PaymentDocument; onDone: () => void }) {
  const today = todayInLima()
  const create = useCreatePayment()
  const [serverError, setServerError] = useState<string | null>(null)
  const [partySearch, setPartySearch] = useState("")
  const deferredPartySearch = useDeferredValue(partySearch)
  const [partyId, setPartyId] = useState(document?.partyId ?? "")
  const [selectedDocumentId, setSelectedDocumentId] = useState(document?.id ?? "")
  const [applicationAmount, setApplicationAmount] = useState("")
  const [applicationError, setApplicationError] = useState<string | null>(null)
  const salesInvoices = useSalesInvoiceOptions()
  const supplierInvoices = useSupplierInvoiceOptions()
  const customers = useCustomerOptions({ includeInactive: true, search: deferredPartySearch })
  const suppliers = useSupplierOptions({ includeInactive: true, search: deferredPartySearch })
  const bankAccounts = useBankAccountOptions()
  const paymentMethods = useMasterCatalogOptions("payment-methods")

  const parties = type === "collection" ? customers.data ?? [] : suppliers.data ?? []
  const partyQuery = type === "collection" ? customers : suppliers
  const partyOptions = parties.map((party) => ({
    value: party.id,
    label: `${party.name} · ${party.document_number}`,
  }))

  // El tercero se elige primero; luego se muestran únicamente sus documentos con saldo.
  const allDocuments: PaymentDocument[] = document
    ? [document]
    : (type === "collection" ? salesInvoices.data : supplierInvoices.data)
        ?.filter((doc) => ("customer_id" in doc ? doc.customer_id : doc.supplier_id) === partyId)
        .map((doc) => ({
          id: doc.id,
          label: `${doc.code} · ${"customer_name" in doc ? doc.customer_name : doc.supplier_name}`,
          balance: doc.balance,
          partyId,
        })) ?? []
  const documentsQuery = type === "collection" ? salesInvoices : supplierInvoices

  const availableDocuments = type === "collection" ? salesInvoices.data ?? [] : supplierInvoices.data ?? []
  const balances = Object.fromEntries(availableDocuments.map((item) => [item.id, item.balance]))
  if (document) balances[document.id] = document.balance
  const resolver: Resolver<PaymentInput> = (values, context, options) =>
    zodResolver(paymentInputSchema({ balances, today }))(values, context, options)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver,
    defaultValues: emptyPayment(type, type === "collection" ? "sales_invoice" : "supplier_invoice", today),
  })
  const formValuesApplications = useWatch({ control, name: "applications" }) ?? []
  const documents = (allDocuments ?? []).filter(
    (doc) => !formValuesApplications.some((application) => application.document_id === doc.id),
  )
  const method = useWatch({ control, name: "method" })
  const bankAccountId = useWatch({ control, name: "bank_account_id" })
  const selected = allDocuments.find((doc) => doc.id === selectedDocumentId)
  const appliedTotal = formValuesApplications.reduce((sum, application) => sum + toCents(application.amount), 0)
  const availableMethods = PAYMENT_METHODS.filter((value) =>
    paymentMethods.data?.some((item) => item.value === value),
  )
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.includes(method)) {
      setValue("method", availableMethods[0], { shouldDirty: true })
    }
  }, [availableMethods, method, setValue])

  const addApplication = () => {
    setApplicationError(null)
    if (!selected) {
      setApplicationError("Selecciona un documento para aplicar el importe.")
      return
    }
    if (!/^\d+(\.\d{1,2})?$/.test(applicationAmount) || toCents(applicationAmount) <= 0) {
      setApplicationError("Ingresa un importe válido mayor que cero.")
      return
    }
    if (toCents(applicationAmount) > toCents(selected.balance)) {
      setApplicationError("El importe no puede superar el saldo del documento.")
      return
    }
    const next = [...formValuesApplications, { document_id: selected.id, amount: applicationAmount }]
    setValue("applications", next, { shouldDirty: true, shouldValidate: true })
    setSelectedDocumentId("")
    setApplicationAmount("")
  }

  const onSubmit = (values: PaymentInput) => {
    setServerError(null)
    create.mutate(values, {
      onSuccess: onDone,
      onError: (error) => {
        if (isApiError(error)) {
          for (const item of error.fieldErrors) {
            if (item.field.startsWith("applications.")) {
              setError("applications", { message: item.message })
            } else {
              const field = FIELDS.find((candidate) => candidate === item.field)
              if (field) setError(field, { message: item.message })
            }
          }
        }
        setServerError(getErrorMessage(error))
      },
    })
  }

  const invalid = (name: keyof PaymentInput) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  })

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-1">
        <Field id="party_id" label={type === "collection" ? "Cliente" : "Proveedor"}>
          <EntityPickerDialog
            options={partyOptions}
            value={partyId}
            onValueChange={(value) => {
              setPartyId(value)
              setPartySearch("")
              setSelectedDocumentId("")
              setApplicationAmount("")
              setApplicationError(null)
              setValue("applications", [], { shouldDirty: true, shouldValidate: true })
            }}
            onSearchChange={setPartySearch}
            disabled={create.isPending || partyQuery.isPending || !!document}
            isLoading={partyQuery.isPending}
            errorMessage={partyQuery.isError ? getErrorMessage(partyQuery.error) : undefined}
            title={type === "collection" ? "Buscar cliente" : "Buscar proveedor"}
            placeholder={type === "collection" ? "Selecciona un cliente" : "Selecciona un proveedor"}
            searchPlaceholder={type === "collection" ? "Buscar cliente..." : "Buscar proveedor..."}
            emptyLabel={type === "collection" ? "No se encontraron clientes." : "No se encontraron proveedores."}
          />
          {partyQuery.isError && <p role="alert" className="text-sm text-danger-text">{getErrorMessage(partyQuery.error)}</p>}
        </Field>
      </div>
      <div className="sm:col-span-1">
        <Field id="document_id" label={type === "collection" ? "Comprobante" : "Factura del proveedor"}>
        <EntityPickerDialog
          options={(documents ?? []).map((doc) => ({
            value: doc.id,
            label: `${doc.label} · saldo ${formatMoney(doc.balance)}`,
          }))}
          value={selectedDocumentId}
          onValueChange={setSelectedDocumentId}
          disabled={create.isPending || documentsQuery.isPending || partyId === ""}
          isLoading={documentsQuery.isPending}
          errorMessage={documentsQuery.isError ? getErrorMessage(documentsQuery.error) : undefined}
          placeholder="Selecciona el documento"
        />
        {documentsQuery.isError && <p className="text-sm text-danger-text">{getErrorMessage(documentsQuery.error)}</p>}
        </Field>
      </div>

      <Field id="application-amount" label="Importe a aplicar (S/)" error={applicationError ?? errors.applications?.message}>
        <Input
          id="application-amount"
          inputMode="decimal"
          placeholder="0.00"
          disabled={create.isPending || !selected}
          value={applicationAmount}
          onChange={(event) => {
            setApplicationAmount(event.target.value)
            setApplicationError(null)
          }}
          aria-invalid={!!applicationError || !!errors.applications}
          aria-describedby={applicationError || errors.applications ? "application-amount-error" : undefined}
        />
        {selected && !errors.applications && (
          <p className="text-xs text-muted-foreground">Saldo del documento: {formatMoney(selected.balance)}</p>
        )}
      </Field>
      <div className="flex items-end">
        <Button type="button" variant="outline" disabled={create.isPending || !selected} onClick={addApplication}>
          Agregar aplicación
        </Button>
      </div>
      {formValuesApplications.length > 0 && (
        <div className="space-y-2 sm:col-span-2">
          <h3 className="text-sm font-medium">Aplicaciones</h3>
          <ul className="divide-y rounded-md border">
            {formValuesApplications.map((application, index) => {
              const appliedDocument = allDocuments.find((item) => item.id === application.document_id)
              return (
                <li key={application.document_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>{appliedDocument?.label ?? application.document_id}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono">{formatMoney(application.amount)}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={create.isPending}
                      aria-label={`Quitar aplicación ${index + 1}`}
                      onClick={() => {
                        const next = formValuesApplications.filter((_, itemIndex) => itemIndex !== index)
                        setValue("applications", next, { shouldDirty: true, shouldValidate: true })
                      }}
                    >
                      Quitar
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="text-right text-sm font-medium">Total: {formatMoney(fromCents(appliedTotal))}</p>
        </div>
      )}
      <Field id="payment_date" label="Fecha" error={errors.payment_date?.message}>
        <Input id="payment_date" type="date" max={today} disabled={create.isPending} {...invalid("payment_date")} {...register("payment_date")} />
      </Field>

      <Field id="method" label="Medio de pago">
        <Select
          value={method}
          onValueChange={(value) => setValue("method", value as PaymentInput["method"], { shouldDirty: true })}
          disabled={create.isPending || paymentMethods.isPending || availableMethods.length === 0}
        >
          <SelectTrigger id="method" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMethods.map((value) => (
              <SelectItem key={value} value={value}>
                {paymentMethods.data?.find((item) => item.value === value)?.name ?? PAYMENT_METHOD_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {paymentMethods.isError && <p role="alert" className="text-sm text-danger-text">{getErrorMessage(paymentMethods.error)}</p>}
        {!paymentMethods.isError && !paymentMethods.isPending && availableMethods.length === 0 && (
          <p role="alert" className="text-sm text-danger-text">No hay formas de pago activas compatibles con Tesorería.</p>
        )}
        {method === "cash" && (
          <p className="text-xs text-muted-foreground">El efectivo exige una caja abierta: entrará como movimiento de la caja.</p>
        )}
      </Field>

      {method === "transfer" && (
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <Field id="bank_account_id" label="Cuenta bancaria" error={errors.bank_account_id?.message}>
            <EntityPickerDialog
              options={(bankAccounts.data ?? [])
                .filter((account) => account.currency === "PEN")
                .map((account) => ({ value: account.id, label: bankAccountLabel(account) }))}
              value={bankAccountId ?? ""}
              onValueChange={(value) => setValue("bank_account_id", value, { shouldDirty: true })}
              disabled={create.isPending || bankAccounts.isPending}
              isLoading={bankAccounts.isPending}
              placeholder="Selecciona la cuenta"
              aria-invalid={!!errors.bank_account_id}
              aria-describedby={errors.bank_account_id ? "bank_account_id-error" : undefined}
            />
          </Field>
          <Field id="operation_number" label="Número de operación" error={errors.operation_number?.message}>
            <Input id="operation_number" disabled={create.isPending} {...invalid("operation_number")} {...register("operation_number")} />
          </Field>
        </div>
      )}

      <Field id="reference" label="Referencia" error={errors.reference?.message}>
        <Input id="reference" placeholder="Opcional" disabled={create.isPending} {...invalid("reference")} {...register("reference")} />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text sm:col-span-2">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={create.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={create.isPending || paymentMethods.isPending || paymentMethods.isError || availableMethods.length === 0}
        >
          {create.isPending ? "Registrando..." : `Registrar ${PAYMENT_TYPE_LABELS[type].toLowerCase()}`}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Registrar un cobro (de un comprobante) o un pago (a una factura de proveedor) */
export function PaymentFormDialog({ open, onOpenChange, type, document }: PaymentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar {PAYMENT_TYPE_LABELS[type].toLowerCase()}</DialogTitle>
          <DialogDescription>
            El registro debe aprobarse y ejecutarse antes de afectar el saldo. El monto no puede superar el saldo disponible.
          </DialogDescription>
        </DialogHeader>
        {open && <PaymentForm key={`${type}-${document?.id ?? ""}`} type={type} document={document} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
