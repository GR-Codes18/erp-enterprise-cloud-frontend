import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { useCreateCustomer, useUpdateCustomer } from "../hooks"
import {
  CUSTOMER_STATUSES,
  DOCUMENT_TYPES,
  EMPTY_CUSTOMER,
  STATUS_LABELS,
  customerInputSchema,
  type Customer,
  type CustomerInput,
} from "../schema"

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; un cliente = editar */
  customer: Customer | null
}

function toFormValues(customer: Customer): CustomerInput {
  return {
    document_type: customer.document_type,
    document_number: customer.document_number,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    credit_limit: customer.credit_limit,
    status: customer.status,
  }
}

function CustomerForm({ customer, onDone }: { customer: Customer | null; onDone: () => void }) {
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const isPending = createCustomer.isPending || updateCustomer.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerInputSchema),
    defaultValues: customer ? toFormValues(customer) : EMPTY_CUSTOMER,
  })

  const handleError = (error: unknown) => {
    // Errores por campo que devuelva el backend se muestran junto a su campo
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        setError(item.field as keyof CustomerInput, { message: item.message })
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: CustomerInput) => {
    setServerError(null)
    const options = { onSuccess: onDone, onError: handleError }
    if (customer) {
      updateCustomer.mutate({ id: customer.id, input: values }, options)
    } else {
      createCustomer.mutate(values, options)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field id="document_type" label="Tipo">
          <Controller
            control={control}
            name="document_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="document_type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id="document_number" label="N.º de documento" error={errors.document_number?.message}>
          <Input
            id="document_number"
            autoComplete="off"
            aria-invalid={!!errors.document_number}
            aria-describedby={errors.document_number ? "document_number-error" : undefined}
            {...register("document_number")}
          />
        </Field>
      </div>

      <Field id="name" label="Nombre o razón social" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="email" label="Correo" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </Field>
        <Field id="phone" label="Teléfono" error={errors.phone?.message}>
          <Input
            id="phone"
            autoComplete="off"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            {...register("phone")}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="credit_limit" label="Límite de crédito (S/)" error={errors.credit_limit?.message}>
          <Input
            id="credit_limit"
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={!!errors.credit_limit}
            aria-describedby={errors.credit_limit ? "credit_limit-error" : undefined}
            {...register("credit_limit")}
          />
        </Field>
        <Field id="status" label="Estado">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : customer ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {customer ? "Modifica los datos del cliente." : "Completa los datos del nuevo cliente."}
          </DialogDescription>
        </DialogHeader>
        {/* El formulario solo existe mientras el diálogo está abierto: cada apertura
            parte de valores limpios, sin necesidad de reset manual */}
        <CustomerForm
          key={customer?.id ?? "new"}
          customer={customer}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}