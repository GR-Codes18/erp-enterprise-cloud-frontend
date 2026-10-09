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
import { useCreateSupplier, useUpdateSupplier } from "../hooks"
import {
  DOCUMENT_TYPES,
  EMPTY_SUPPLIER,
  STATUS_LABELS,
  SUPPLIER_STATUSES,
  supplierCreateSchema,
  supplierUpdateSchema,
  type Supplier,
  type SupplierCreateInput,
  type SupplierUpdateInput,
} from "../schema"

interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; un proveedor = editar */
  supplier: Supplier | null
}

function SupplierCreateForm({ onDone }: { onDone: () => void }) {
  const createSupplier = useCreateSupplier()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SupplierCreateInput>({
    resolver: zodResolver(supplierCreateSchema),
    defaultValues: EMPTY_SUPPLIER,
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
        "Ya existe un proveedor con este número de documento"
      setError("document_number", { message: docMessage })
      return
    }

    if (isApiError(error) && error.fieldErrors && error.fieldErrors.length > 0) {
      for (const item of error.fieldErrors) {
        if (item.field) {
          setError(item.field as keyof SupplierCreateInput, { message: item.message })
        }
      }
      return
    }

    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: SupplierCreateInput) => {
    setServerError(null)
    createSupplier.mutate(values, {
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
        <Field id="credit_days" label="Días de crédito" error={errors.credit_days?.message}>
          <Input
            id="credit_days"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={!!errors.credit_days}
            aria-describedby={errors.credit_days ? "credit_days-error" : undefined}
            {...register("credit_days", { valueAsNumber: true })}
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
                  {SUPPLIER_STATUSES.map((status) => (
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
        <Button type="button" variant="outline" disabled={createSupplier.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createSupplier.isPending}>
          {createSupplier.isPending ? "Guardando..." : "Crear proveedor"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function SupplierUpdateForm({ supplier, onDone }: { supplier: Supplier; onDone: () => void }) {
  const updateSupplier = useUpdateSupplier()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SupplierUpdateInput>({
    resolver: zodResolver(supplierUpdateSchema),
    defaultValues: {
      name: supplier.name,
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      credit_days: supplier.credit_days,
      status: supplier.status,
    },
  })

  const handleError = (error: unknown) => {
    if (isApiError(error) && error.fieldErrors && error.fieldErrors.length > 0) {
      for (const item of error.fieldErrors) {
        if (item.field) {
          setError(item.field as keyof SupplierUpdateInput, { message: item.message })
        }
      }
      return
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: SupplierUpdateInput) => {
    setServerError(null)
    updateSupplier.mutate(
      { id: supplier.id, input: values },
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
            value={supplier.document_type}
            disabled
            className="bg-muted opacity-70"
          />
        </Field>
        <Field id="document_number-disabled" label="N.º de documento (Inmutable)">
          <Input
            id="document_number-disabled"
            value={supplier.document_number}
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
        <Field id="credit_days" label="Días de crédito" error={errors.credit_days?.message}>
          <Input
            id="credit_days"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={!!errors.credit_days}
            aria-describedby={errors.credit_days ? "credit_days-error" : undefined}
            {...register("credit_days", { valueAsNumber: true })}
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
                  {SUPPLIER_STATUSES.map((status) => (
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
        <Button type="button" variant="outline" disabled={updateSupplier.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateSupplier.isPending}>
          {updateSupplier.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>
            {supplier
              ? "Modifica los datos del proveedor. El documento es inmutable."
              : "Completa los datos del nuevo proveedor."}
          </DialogDescription>
        </DialogHeader>
        {supplier ? (
          <SupplierUpdateForm key={supplier.id} supplier={supplier} onDone={() => onOpenChange(false)} />
        ) : (
          <SupplierCreateForm key="new" onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}