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
import { useCreateWarehouse, useUpdateWarehouse } from "../hooks"
import {
  EMPTY_WAREHOUSE,
  STATUS_LABELS,
  WAREHOUSE_STATUSES,
  warehouseInputSchema,
  type Warehouse,
  type WarehouseInput,
} from "../schema"

interface WarehouseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; un almacén = editar */
  warehouse: Warehouse | null
}

function toFormValues(warehouse: Warehouse): WarehouseInput {
  return {
    code: warehouse.code,
    name: warehouse.name,
    address: warehouse.address ?? "",
    status: warehouse.status,
  }
}

function WarehouseForm({ warehouse, onDone }: { warehouse: Warehouse | null; onDone: () => void }) {
  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()
  const isPending = createWarehouse.isPending || updateWarehouse.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WarehouseInput>({
    resolver: zodResolver(warehouseInputSchema),
    defaultValues: warehouse ? toFormValues(warehouse) : EMPTY_WAREHOUSE,
  })

  const handleError = (error: unknown) => {
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        setError(item.field as keyof WarehouseInput, { message: item.message })
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: WarehouseInput) => {
    setServerError(null)
    const options = { onSuccess: onDone, onError: handleError }
    if (warehouse) {
      updateWarehouse.mutate({ id: warehouse.id, input: values }, options)
    } else {
      createWarehouse.mutate(values, options)
    }
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
        <Button type="button" variant="outline" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : warehouse ? "Guardar cambios" : "Crear almacén"}
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
            {warehouse ? "Modifica los datos del almacén." : "Completa la información para registrar un nuevo almacén."}
          </DialogDescription>
        </DialogHeader>
        <WarehouseForm
          key={warehouse?.id ?? "new"}
          warehouse={warehouse}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}