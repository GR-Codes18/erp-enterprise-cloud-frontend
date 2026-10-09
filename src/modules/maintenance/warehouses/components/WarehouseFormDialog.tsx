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
import { useCreateWarehouse, useUpdateWarehouse } from "../hooks"
import {
  EMPTY_WAREHOUSE,
  STATUS_LABELS,
  WAREHOUSE_STATUSES,
  warehouseCreateSchema,
  warehouseUpdateSchema,
  type Warehouse,
  type WarehouseCreateInput,
  type WarehouseUpdateInput,
} from "../schema"

interface WarehouseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; un almacén = editar */
  warehouse: Warehouse | null
}

function WarehouseCreateForm({ onDone }: { onDone: () => void }) {
  const createWarehouse = useCreateWarehouse()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WarehouseCreateInput>({
    resolver: zodResolver(warehouseCreateSchema),
    defaultValues: EMPTY_WAREHOUSE,
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
      const codeMessage =
        fieldErrors?.find((f) => f.field === "code")?.message ||
        "Ya existe un almacén con este código"
      setError("code", { message: codeMessage })
      return
    }

    if (isApiError(error) && error.fieldErrors && error.fieldErrors.length > 0) {
      for (const item of error.fieldErrors) {
        if (item.field) {
          setError(item.field as keyof WarehouseCreateInput, { message: item.message })
        }
      }
      return
    }

    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: WarehouseCreateInput) => {
    setServerError(null)
    createWarehouse.mutate(values, {
      onSuccess: onDone,
      onError: handleError,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="code" label="Código" error={errors.code?.message}>
          <Input
            id="code"
            autoComplete="off"
            placeholder="Ej. ALM-001"
            aria-invalid={!!errors.code}
            aria-describedby={errors.code ? "code-error" : undefined}
            {...register("code")}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="name" label="Nombre del almacén" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="off"
              placeholder="Ej. Almacén Central"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
          </Field>
        </div>
      </div>

      <Field id="address" label="Dirección (Opcional)" error={errors.address?.message}>
        <Input
          id="address"
          autoComplete="off"
          placeholder="Ej. Av. Industrial 123"
          aria-invalid={!!errors.address}
          aria-describedby={errors.address ? "address-error" : undefined}
          {...register("address")}
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
                {WAREHOUSE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={createWarehouse.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createWarehouse.isPending}>
          {createWarehouse.isPending ? "Guardando..." : "Crear almacén"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function WarehouseUpdateForm({ warehouse, onDone }: { warehouse: Warehouse; onDone: () => void }) {
  const updateWarehouse = useUpdateWarehouse()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WarehouseUpdateInput>({
    resolver: zodResolver(warehouseUpdateSchema),
    defaultValues: {
      name: warehouse.name,
      address: warehouse.address ?? "",
      status: warehouse.status,
    },
  })

  const handleError = (error: unknown) => {
    if (isApiError(error) && error.fieldErrors && error.fieldErrors.length > 0) {
      for (const item of error.fieldErrors) {
        if (item.field) {
          setError(item.field as keyof WarehouseUpdateInput, { message: item.message })
        }
      }
      return
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: WarehouseUpdateInput) => {
    setServerError(null)
    updateWarehouse.mutate(
      { id: warehouse.id, input: values },
      {
        onSuccess: onDone,
        onError: handleError,
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="code-disabled" label="Código (Inmutable)">
          <Input
            id="code-disabled"
            value={warehouse.code}
            disabled
            className="bg-muted opacity-70"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="name" label="Nombre del almacén" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="off"
              placeholder="Ej. Almacén Central"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
          </Field>
        </div>
      </div>

      <Field id="address" label="Dirección (Opcional)" error={errors.address?.message}>
        <Input
          id="address"
          autoComplete="off"
          placeholder="Ej. Av. Industrial 123"
          aria-invalid={!!errors.address}
          aria-describedby={errors.address ? "address-error" : undefined}
          {...register("address")}
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
                {WAREHOUSE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={updateWarehouse.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateWarehouse.isPending}>
          {updateWarehouse.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function WarehouseFormDialog({ open, onOpenChange, warehouse }: WarehouseFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{warehouse ? "Editar almacén" : "Nuevo almacén"}</DialogTitle>
          <DialogDescription>
            {warehouse
              ? "Modifica los datos del almacén. El código es inmutable."
              : "Completa la información para registrar un nuevo almacén."}
          </DialogDescription>
        </DialogHeader>
        {warehouse ? (
          <WarehouseUpdateForm key={warehouse.id} warehouse={warehouse} onDone={() => onOpenChange(false)} />
        ) : (
          <WarehouseCreateForm key="new" onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}