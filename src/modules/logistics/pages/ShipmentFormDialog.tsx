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
import { getErrorMessage } from "@/shared/lib/api/errors"
import { useCreateShipment, useUpdateShipment } from "../hooks"
import {
  EMPTY_SHIPMENT,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  shipmentInputSchema,
  type Shipment,
  type ShipmentInput,
} from "../schema"

interface ShipmentFormDialogProps {
  open: boolean
  shipment: Shipment | null
  onOpenChange: (open: boolean) => void
}

function ShipmentForm({
  shipment,
  onDone,
}: {
  shipment: Shipment | null
  onDone: () => void
}) {
  const create = useCreateShipment()
  const update = useUpdateShipment()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<ShipmentInput>({
    resolver: zodResolver(shipmentInputSchema),
    defaultValues: shipment
      ? {
          reference: shipment.reference,
          transporter: shipment.transporter,
          origin: shipment.origin,
          destination: shipment.destination,
          scheduled_date: shipment.scheduled_date,
          freight_amount: shipment.freight_amount,
          status: shipment.status,
        }
      : EMPTY_SHIPMENT,
  })
  const pending = create.isPending || update.isPending

  const onSubmit = (input: ShipmentInput) => {
    setServerError(null)
    const mutation = shipment
      ? update.mutateAsync({ id: shipment.id, input })
      : create.mutateAsync(input)
    void mutation.then(onDone).catch((error: unknown) => setServerError(getErrorMessage(error)))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <Field id="shipment-reference" label="Referencia" error={form.formState.errors.reference?.message}>
        <Input id="shipment-reference" autoComplete="off" {...form.register("reference")} />
      </Field>
      <Field id="shipment-transporter" label="Transportista" error={form.formState.errors.transporter?.message}>
        <Input id="shipment-transporter" autoComplete="organization" {...form.register("transporter")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="shipment-origin" label="Origen" error={form.formState.errors.origin?.message}>
          <Input id="shipment-origin" {...form.register("origin")} />
        </Field>
        <Field id="shipment-destination" label="Destino" error={form.formState.errors.destination?.message}>
          <Input id="shipment-destination" {...form.register("destination")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="shipment-date" label="Fecha programada" error={form.formState.errors.scheduled_date?.message}>
          <Input id="shipment-date" type="date" {...form.register("scheduled_date")} />
        </Field>
        <Field id="shipment-freight" label="Flete (S/)" error={form.formState.errors.freight_amount?.message}>
          <Input id="shipment-freight" inputMode="decimal" {...form.register("freight_amount")} />
        </Field>
        <Field id="shipment-status" label="Estado">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="shipment-status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIPMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{SHIPMENT_STATUS_LABELS[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      {serverError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">{serverError}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Guardando..." : shipment ? "Guardar cambios" : "Crear transporte"}</Button>
      </DialogFooter>
    </form>
  )
}

export function ShipmentFormDialog({ open, shipment, onOpenChange }: ShipmentFormDialogProps) {
  const title = shipment ? "Editar transporte" : "Programar transporte"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Registra el transportista, recorrido, fecha y costo del envío.</DialogDescription>
        </DialogHeader>
        {open && <ShipmentForm key={shipment?.id ?? "new"} shipment={shipment} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
