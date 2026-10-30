import { useState } from "react"
import { Controller, useWatch, useForm } from "react-hook-form"
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
import { formatMoney } from "@/shared/lib/money"
import { useCreateCommission, useUpdateCommission } from "../hooks"
import { calculateCommission } from "../calculation"
import {
  COMMISSION_STATUSES,
  COMMISSION_STATUS_LABELS,
  commissionInputSchema,
  EMPTY_COMMISSION,
  type Commission,
  type CommissionInput,
} from "../schema"

interface CommissionFormDialogProps {
  open: boolean
  commission: Commission | null
  onOpenChange: (open: boolean) => void
}

function CommissionForm({
  commission,
  onDone,
}: {
  commission: Commission | null
  onDone: () => void
}) {
  const create = useCreateCommission()
  const update = useUpdateCommission()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<CommissionInput>({
    resolver: zodResolver(commissionInputSchema),
    defaultValues: commission
      ? {
          seller_name: commission.seller_name,
          period: commission.period,
          sales_amount: commission.sales_amount,
          rate_percentage: commission.rate_percentage,
          status: commission.status,
        }
      : EMPTY_COMMISSION,
  })
  const salesAmount = useWatch({ control: form.control, name: "sales_amount" })
  const rate = useWatch({ control: form.control, name: "rate_percentage" })
  const pending = create.isPending || update.isPending
  let calculatedAmount = "—"
  try {
    if (/^\d{1,7}(\.\d{1,2})?$/.test(salesAmount ?? "") && /^\d{1,3}(\.\d{1,2})?$/.test(rate ?? "")) {
      calculatedAmount = formatMoney(calculateCommission(salesAmount, rate))
    }
  } catch {
    calculatedAmount = "—"
  }

  const onSubmit = (input: CommissionInput) => {
    setServerError(null)
    const mutation = commission
      ? update.mutateAsync({ id: commission.id, input })
      : create.mutateAsync(input)
    void mutation.then(onDone).catch((error: unknown) => setServerError(getErrorMessage(error)))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <Field id="commission-seller" label="Vendedor" error={form.formState.errors.seller_name?.message}>
        <Input id="commission-seller" autoComplete="name" {...form.register("seller_name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="commission-period" label="Período" error={form.formState.errors.period?.message}>
          <Input id="commission-period" type="month" {...form.register("period")} />
        </Field>
        <Field id="commission-status" label="Estado">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="commission-status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMISSION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{COMMISSION_STATUS_LABELS[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="commission-sales" label="Ventas del período (S/)" error={form.formState.errors.sales_amount?.message}>
          <Input id="commission-sales" inputMode="decimal" {...form.register("sales_amount")} />
        </Field>
        <Field id="commission-rate" label="Comisión (%)" error={form.formState.errors.rate_percentage?.message}>
          <Input id="commission-rate" inputMode="decimal" {...form.register("rate_percentage")} />
        </Field>
      </div>
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">Comisión calculada</p>
        <p className="mt-1 text-lg font-semibold">{calculatedAmount}</p>
      </div>
      {serverError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">{serverError}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Guardando..." : commission ? "Guardar cambios" : "Registrar comisión"}</Button>
      </DialogFooter>
    </form>
  )
}

export function CommissionFormDialog({ open, commission, onOpenChange }: CommissionFormDialogProps) {
  const title = commission ? "Editar comisión" : "Registrar comisión"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Registra las ventas del período y calcula la comisión automáticamente.</DialogDescription>
        </DialogHeader>
        {open && <CommissionForm key={commission?.id ?? "new"} commission={commission} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
