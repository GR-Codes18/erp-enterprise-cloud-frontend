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
import type { FieldError } from "@/shared/lib/api/types"
import { useCreateCustomer, useUpdateCustomer } from "../hooks"
import {
  CUSTOMER_STATUSES,
  DOCUMENT_TYPES,
  EMPTY_CUSTOMER,
  STATUS_LABELS,
  customerCreateSchema,
  customerUpdateSchema,
  type Customer,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from "../schema"

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; un cliente = editar */
  customer: Customer | null
}

function CustomerCreateForm({ onDone }: { onDone: () => void }) {
  const createCustomer = useCreateCustomer()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: EMPTY_CUSTOMER,
  })

  const handleError = (error: unknown) => {
    const status = isApiError(error)
      ? error.status
      : (error as { status?: number; response?: { status?: number } })?.status ??
        (error as { response?: { status?: number } })?.response?.status

    if (status === 409) {
      const fieldErrors = isApiError(error)
        ? error.fieldErrors
        : (error as { fieldErrors?: FieldError[] })?.fieldErrors
      const docMessage =
        fieldErrors?.find((f) => f.field === "document_number")?.message ||
        "Ya existe un cliente con este número de documento"
      setError("document_number", { message: docMessage })
      return
    }

    if (isApiError(error) && error.fieldErrors && error.fieldErrors.length > 0) {
      for (const item of error.fieldErrors) {
        if (item.field) {
          setError(item.field as keyof CustomerCreateInput, { message: item.message })
        }
      }
      return
    }

    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: CustomerCreateInput) => {
    setServerError(null)
    createCustomer.mutate(values, {
      onSuccess: onDone,
      onError: handleError,
    })
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
        <Button type="button" variant="outline" disabled={createCustomer.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createCustomer.isPending}>
          {createCustomer.isPending ? "Guardando..." : "Crear cliente"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function CustomerUpdateForm({ customer, onDone }: { customer: Customer; onDone: () => void }) {
  const updateCustomer = useUpdateCustomer()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerUpdateInput>({
    resolver: zodResolver(customerUpdateSchema),
    defaultValues: {
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      credit_limit: customer.credit_limit,
      status: customer.status,
    },
  })

  const handleError = (error: unknown) => {
    if (isApiError(error) && error.fieldErrors && error.fieldErrors.length > 0) {
      for (const item of error.fieldErrors) {
        if (item.field) {
          setError(item.field as keyof CustomerUpdateInput, { message: item.message })
        }
      }
      return
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: CustomerUpdateInput) => {
    setServerError(null)
    updateCustomer.mutate(
      { id: customer.id, input: values },
      {
        onSuccess: onDone,
        onError: handleError,
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field id="document_type-disabled" label="Tipo (Inmutable)">
          <Input
            id="document_type-disabled"
            value={customer.document_type}
            disabled
            className="bg-muted opacity-70"
          />
        </Field>
        <Field id="document_number-disabled" label="N.º de documento (Inmutable)">
          <Input
            id="document_number-disabled"
            value={customer.document_number}
            disabled
            className="bg-muted opacity-70"
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
        <Button type="button" variant="outline" disabled={updateCustomer.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateCustomer.isPending}>
          {updateCustomer.isPending ? "Guardando..." : "Guardar cambios"}
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
            {customer
              ? "Modifica los datos del cliente. El documento es inmutable."
              : "Completa los datos del nuevo cliente."}
          </DialogDescription>
        </DialogHeader>
        {customer ? (
          <CustomerUpdateForm key={customer.id} customer={customer} onDone={() => onOpenChange(false)} />
        ) : (
          <CustomerCreateForm key="new" onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}