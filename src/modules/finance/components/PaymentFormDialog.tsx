import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type Resolver } from "react-hook-form"
import { useSupplierInvoiceOptions } from "@/modules/purchases"
import { useSalesInvoiceOptions } from "@/modules/sales"
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
import { formatMoney } from "@/shared/lib/money"
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
}

const FIELDS = new Set(["document_id", "method", "amount", "payment_date", "bank_account_id", "operation_number", "reference"])

function PaymentForm({ type, document, onDone }: { type: PaymentType; document?: PaymentDocument; onDone: () => void }) {
  const documentId = document?.id ?? ""
  const today = todayInLima()
  const create = useCreatePayment()
  const [serverError, setServerError] = useState<string | null>(null)
  const salesInvoices = useSalesInvoiceOptions()
  const supplierInvoices = useSupplierInvoiceOptions()
  const bankAccounts = useBankAccountOptions()

  // Con documento preseleccionado se usa su saldo; si no, se elige entre los que tienen saldo
  const documents: PaymentDocument[] | undefined = document
    ? [document]
    : (type === "collection" ? salesInvoices.data : supplierInvoices.data)?.map((doc) => ({
        id: doc.id,
        label: `${doc.code} · ${"customer_name" in doc ? doc.customer_name : doc.supplier_name}`,
        balance: doc.balance,
      }))
  const documentsQuery = type === "collection" ? salesInvoices : supplierInvoices

  // El saldo depende del documento elegido: el resolver lo busca en cada validación
  const balanceOf = (id: string) => documents?.find((doc) => doc.id === id)?.balance ?? "0.00"
  const resolver: Resolver<PaymentInput> = (values, context, options) =>
    zodResolver(paymentInputSchema({ balance: balanceOf(values.document_id), today }))(values, context, options)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver,
    defaultValues: emptyPayment(type, type === "collection" ? "sales_invoice" : "supplier_invoice", documentId, today),
  })
  const [selectedId, method, bankAccountId] = useWatch({ control, name: ["document_id", "method", "bank_account_id"] })
  const selected = documents?.find((doc) => doc.id === selectedId)

  const onSubmit = (values: PaymentInput) => {
    setServerError(null)
    create.mutate(values, {
      onSuccess: onDone,
      onError: (error) => {
        if (isApiError(error)) {
          for (const item of error.fieldErrors) {
            if (FIELDS.has(item.field)) setError(item.field as keyof PaymentInput, { message: item.message })
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
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <Field id="document_id" label={type === "collection" ? "Comprobante" : "Factura del proveedor"} error={errors.document_id?.message}>
        <Select
          value={selectedId || undefined}
          onValueChange={(value) => setValue("document_id", value, { shouldDirty: true })}
          disabled={create.isPending || documentsQuery.isPending || documentId !== ""}
        >
          <SelectTrigger id="document_id" className="w-full" {...invalid("document_id")}>
            <SelectValue placeholder="Selecciona el documento" />
          </SelectTrigger>
          <SelectContent>
            {(documents ?? []).map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                {doc.label} · saldo {formatMoney(doc.balance)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {documentsQuery.isError && <p className="text-sm text-danger-text">{getErrorMessage(documentsQuery.error)}</p>}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="amount" label="Monto (S/)" error={errors.amount?.message}>
          <Input id="amount" inputMode="decimal" placeholder="0.00" disabled={create.isPending} {...invalid("amount")} {...register("amount")} />
          {selected && !errors.amount && (
            <p className="text-xs text-muted-foreground">Saldo del documento: {formatMoney(selected.balance)}</p>
          )}
        </Field>
        <Field id="payment_date" label="Fecha" error={errors.payment_date?.message}>
          <Input id="payment_date" type="date" max={today} disabled={create.isPending} {...invalid("payment_date")} {...register("payment_date")} />
        </Field>
      </div>

      <Field id="method" label="Medio de pago">
        <Select
          value={method}
          onValueChange={(value) => setValue("method", value as PaymentInput["method"], { shouldDirty: true })}
          disabled={create.isPending}
        >
          <SelectTrigger id="method" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((value) => (
              <SelectItem key={value} value={value}>
                {PAYMENT_METHOD_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {method === "cash" && (
          <p className="text-xs text-muted-foreground">El efectivo exige una caja abierta: entrará como movimiento de la caja.</p>
        )}
      </Field>

      {method === "transfer" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="bank_account_id" label="Cuenta bancaria" error={errors.bank_account_id?.message}>
            <Select
              value={bankAccountId || undefined}
              onValueChange={(value) => setValue("bank_account_id", value, { shouldDirty: true })}
              disabled={create.isPending || bankAccounts.isPending}
            >
              <SelectTrigger id="bank_account_id" className="w-full" {...invalid("bank_account_id")}>
                <SelectValue placeholder="Selecciona la cuenta" />
              </SelectTrigger>
              <SelectContent>
                {/* Los documentos están en soles: solo cuentas en soles */}
                {(bankAccounts.data ?? []).filter((account) => account.currency === "PEN").map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {bankAccountLabel(account)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={create.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending}>
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar {PAYMENT_TYPE_LABELS[type].toLowerCase()}</DialogTitle>
          <DialogDescription>
            El monto no puede superar el saldo del documento. Un {PAYMENT_TYPE_LABELS[type].toLowerCase()} no se edita: si
            hay un error, se anula con motivo.
          </DialogDescription>
        </DialogHeader>
        {open && <PaymentForm key={`${type}-${document?.id ?? ""}`} type={type} document={document} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
