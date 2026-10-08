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
import { useCreateCategory, useUpdateCategory } from "../hooks"
import {
  CATEGORY_STATUSES,
  EMPTY_CATEGORY,
  STATUS_LABELS,
  categoryInputSchema,
  type Category,
  type CategoryInput,
} from "../schema"

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; una categoría = editar */
  category: Category | null
}

function toFormValues(category: Category): CategoryInput {
  return {
    name: category.name,
    status: category.status,
  }
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const isPending = createCategory.isPending || updateCategory.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: category ? toFormValues(category) : EMPTY_CATEGORY,
  })

  const handleError = (error: unknown) => {
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        setError(item.field as keyof CategoryInput, { message: item.message })
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: CategoryInput) => {
    setServerError(null)
    const options = { onSuccess: onDone, onError: handleError }
    if (category) {
      updateCategory.mutate({ id: category.id, input: values }, options)
    } else {
      createCategory.mutate(values, options)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <Field id="name" label="Nombre de la categoría" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
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
                {CATEGORY_STATUSES.map((status) => (
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
          {isPending ? "Guardando..." : category ? "Guardar cambios" : "Crear categoría"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            {category ? "Modifica los datos de la categoría." : "Completa el nombre de la nueva categoría."}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          key={category?.id ?? "new"}
          category={category}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}