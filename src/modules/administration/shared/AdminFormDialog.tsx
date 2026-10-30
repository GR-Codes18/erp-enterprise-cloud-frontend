import { useState } from "react"
import { Controller, useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ZodType } from "zod"
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

export interface FormFieldConfig<TForm extends FieldValues> {
  name: Path<TForm>
  label: string
  type?: "text" | "select"
  placeholder?: string
  options?: { value: string; label: string }[]
  /** Se muestra pero no se puede cambiar al editar (ej. la serie de un comprobante) */
  lockedOnEdit?: boolean
  mono?: boolean
  /** Ayuda corta bajo el campo */
  hint?: string
}

interface AdminFormDialogProps<TForm extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  isEdit: boolean
  submitLabel: string
  schema: ZodType<TForm>
  defaultValues: DefaultValues<TForm>
  fields: FormFieldConfig<TForm>[]
  /** Envía los datos; si rechaza, el error se muestra en el campo o en el formulario */
  onSubmit: (values: TForm) => Promise<unknown>
}

function AdminForm<TForm extends FieldValues>({
  isEdit,
  submitLabel,
  schema,
  defaultValues,
  fields,
  onSubmit,
  onDone,
}: Omit<AdminFormDialogProps<TForm>, "open" | "onOpenChange" | "title" | "description"> & { onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TForm>({
    resolver: zodResolver(schema as never) as Resolver<TForm>,
    defaultValues,
  })

  const submit = async (values: TForm) => {
    setServerError(null)
    try {
      await onSubmit(values)
      onDone()
    } catch (error) {
      const fieldErrors = isApiError(error) ? error.fieldErrors : undefined
      if (fieldErrors && fieldErrors.length > 0) {
        const known = new Set(fields.map((field) => field.name as string))
        let unplaced: string | null = null
        for (const item of fieldErrors) {
          if (item.field && known.has(item.field)) setError(item.field as Path<TForm>, { message: item.message })
          else unplaced = item.message
        }
        if (unplaced) setServerError(unplaced)
        return
      }
      setServerError(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4">
      {fields.map((config) => {
        const id = `field-${config.name}`
        const message = (errors[config.name] as { message?: string } | undefined)?.message
        const locked = isEdit && config.lockedOnEdit
        return (
          <Field key={config.name} id={id} label={locked ? `${config.label} (no editable)` : config.label} error={message}>
            {config.type === "select" ? (
              <Controller
                control={control}
                name={config.name}
                render={({ field }) => (
                  <Select value={field.value as string} onValueChange={field.onChange} disabled={locked}>
                    <SelectTrigger id={id} className="w-full" aria-invalid={!!message}>
                      <SelectValue placeholder={config.placeholder ?? "Elige una opción"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(config.options ?? []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <Input
                id={id}
                autoComplete="off"
                placeholder={config.placeholder}
                readOnly={locked}
                className={[config.mono ? "font-mono" : "", locked ? "bg-muted opacity-70" : ""].join(" ").trim()}
                aria-invalid={!!message}
                aria-describedby={message ? `${id}-error` : undefined}
                {...register(config.name)}
              />
            )}
            {config.hint && !message && <p className="text-xs text-muted-foreground">{config.hint}</p>}
          </Field>
        )
      })}

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Formulario en ventana para crear o editar un registro de Administración, definido por sus campos */
export function AdminFormDialog<TForm extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  ...form
}: AdminFormDialogProps<TForm>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <AdminForm {...form} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
