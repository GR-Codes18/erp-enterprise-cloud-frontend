import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Field } from "@/shared/components/Field"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { useUpdateSettings } from "../hooks"
import {
  CURRENCIES,
  CURRENCY_LABELS,
  settingsInputSchema,
  toSettingsInput,
  type Settings,
  type SettingsInput,
} from "../schema"

export function SettingsForm({ settings }: { settings: Settings }) {
  const updateSettings = useUpdateSettings()
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsInputSchema),
    defaultValues: toSettingsInput(settings),
  })

  const handleError = (error: unknown) => {
    // Errores por campo que devuelva el backend se muestran junto a su campo
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        setError(item.field as keyof SettingsInput, { message: item.message })
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: SettingsInput) => {
    setServerError(null)
    setSaved(false)
    updateSettings.mutate(
      { id: settings.id, input: values },
      {
        // El formulario queda "limpio" con lo que el servidor guardó
        onSuccess: (data) => {
          reset(toSettingsInput(data))
          setSaved(true)
        },
        onError: handleError,
      },
    )
  }

  const isPending = updateSettings.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-3xl gap-6">
      <section className="grid gap-4 rounded-md border p-4">
        <h2 className="text-base font-semibold">Datos de la empresa</h2>
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <Field id="company_ruc" label="RUC" error={errors.company_ruc?.message}>
            <Input
              id="company_ruc"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!!errors.company_ruc}
              aria-describedby={errors.company_ruc ? "company_ruc-error" : undefined}
              {...register("company_ruc")}
            />
          </Field>
          <Field id="company_name" label="Razón social" error={errors.company_name?.message}>
            <Input
              id="company_name"
              autoComplete="off"
              aria-invalid={!!errors.company_name}
              aria-describedby={errors.company_name ? "company_name-error" : undefined}
              {...register("company_name")}
            />
          </Field>
        </div>
        <Field id="company_address" label="Dirección" error={errors.company_address?.message}>
          <Input
            id="company_address"
            autoComplete="off"
            aria-invalid={!!errors.company_address}
            aria-describedby={errors.company_address ? "company_address-error" : undefined}
            {...register("company_address")}
          />
        </Field>
      </section>

      <section className="grid gap-4 rounded-md border p-4">
        <h2 className="text-base font-semibold">Impuestos y moneda</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="igv_rate" label="Tasa de IGV (%)" error={errors.igv_rate?.message}>
            <>
              <Input
                id="igv_rate"
                inputMode="decimal"
                autoComplete="off"
                aria-invalid={!!errors.igv_rate}
                aria-describedby={errors.igv_rate ? "igv_rate-error" : undefined}
                {...register("igv_rate")}
              />
              <p className="text-sm text-muted-foreground">
                Un cambio de IGV afecta solo a los documentos nuevos.
              </p>
            </>
          </Field>
          <Field id="currency" label="Moneda por defecto">
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {CURRENCY_LABELS[currency]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-md border p-4">
        <h2 className="text-base font-semibold">Series de comprobantes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="invoice_series" label="Serie de facturas" error={errors.invoice_series?.message}>
            <Input
              id="invoice_series"
              autoComplete="off"
              maxLength={4}
              aria-invalid={!!errors.invoice_series}
              aria-describedby={errors.invoice_series ? "invoice_series-error" : undefined}
              {...register("invoice_series")}
            />
          </Field>
          <Field id="receipt_series" label="Serie de boletas" error={errors.receipt_series?.message}>
            <Input
              id="receipt_series"
              autoComplete="off"
              maxLength={4}
              aria-invalid={!!errors.receipt_series}
              aria-describedby={errors.receipt_series ? "receipt_series-error" : undefined}
              {...register("receipt_series")}
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-md border p-4">
        <h2 className="text-base font-semibold">Inventario</h2>
        <Field
          id="block_negative_stock"
          label="Política de stock"
          error={errors.block_negative_stock?.message}
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              id="block_negative_stock"
              type="checkbox"
              className="size-4 accent-primary"
              checked
              disabled
              readOnly
            />
            No permitir stock negativo (siempre activo)
          </label>
        </Field>
      </section>

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}
      {saved && !isDirty && (
        <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-text">
          Cambios guardados.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || !isDirty}
          onClick={() => {
            setServerError(null)
            reset()
          }}
        >
          Descartar cambios
        </Button>
      </div>
    </form>
  )
}