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
import { useCategoryOptions } from "@/modules/maintenance/categories/hooks"
import { useCreateProduct, useUpdateProduct } from "../hooks"
import {
  EMPTY_PRODUCT,
  PRODUCT_STATUSES,
  STATUS_LABELS,
  productCreateSchema,
  productUpdateSchema,
  type Product,
  type ProductCreateInput,
  type ProductUpdateInput,
} from "../schema"

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

function ProductCreateForm({ onDone }: { onDone: () => void }) {
  const createProduct = useCreateProduct()
  const categoriesQuery = useCategoryOptions()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: EMPTY_PRODUCT,
  })

  const handleError = (error: unknown) => {
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        setError(item.field as keyof ProductCreateInput, { message: item.message })
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: ProductCreateInput) => {
    setServerError(null)
    createProduct.mutate(values, {
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
            placeholder="Ej. PROD-001"
            aria-invalid={!!errors.code}
            aria-describedby={errors.code ? "code-error" : undefined}
            {...register("code")}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="name" label="Nombre del producto" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="off"
              placeholder="Ej. Martillo de Peña 16oz"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
          </Field>
        </div>
      </div>

      <Field id="category_id" label="Categoría" error={errors.category_id?.message}>
        <Controller
          control={control}
          name="category_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="category_id" className="w-full">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoriesQuery.data?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field id="unit_price" label="Precio unitario (S/)" error={errors.unit_price?.message}>
        <Input
          id="unit_price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          aria-invalid={!!errors.unit_price}
          aria-describedby={errors.unit_price ? "unit_price-error" : undefined}
          {...register("unit_price", { valueAsNumber: true })}
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
                {PRODUCT_STATUSES.map((status) => (
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
        <Button type="button" variant="outline" disabled={createProduct.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createProduct.isPending}>
          {createProduct.isPending ? "Guardando..." : "Crear producto"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function ProductUpdateForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const updateProduct = useUpdateProduct()
  const categoriesQuery = useCategoryOptions()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductUpdateInput>({
    resolver: zodResolver(productUpdateSchema),
    defaultValues: {
      name: product.name,
      category_id: product.category_id,
      unit_price: product.unit_price,
      status: product.status,
    },
  })

  const handleError = (error: unknown) => {
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        setError(item.field as keyof ProductUpdateInput, { message: item.message })
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: ProductUpdateInput) => {
    setServerError(null)
    updateProduct.mutate(
      { id: product.id, input: values },
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
          <Input id="code-disabled" value={product.code} disabled className="bg-muted opacity-70" />
        </Field>

        <div className="sm:col-span-2">
          <Field id="name" label="Nombre del producto" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="off"
              placeholder="Ej. Martillo de Peña 16oz"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
          </Field>
        </div>
      </div>

      <Field id="category_id" label="Categoría" error={errors.category_id?.message}>
        <Controller
          control={control}
          name="category_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="category_id" className="w-full">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoriesQuery.data?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field id="unit_price" label="Precio unitario (S/)" error={errors.unit_price?.message}>
        <Input
          id="unit_price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          aria-invalid={!!errors.unit_price}
          aria-describedby={errors.unit_price ? "unit_price-error" : undefined}
          {...register("unit_price", { valueAsNumber: true })}
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
                {PRODUCT_STATUSES.map((status) => (
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
        <Button type="button" variant="outline" disabled={updateProduct.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateProduct.isPending}>
          {updateProduct.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Modifica la información del producto. El código es inmutable."
              : "Completa la información para registrar un nuevo producto."}
          </DialogDescription>
        </DialogHeader>
        {product ? (
          <ProductUpdateForm key={product.id} product={product} onDone={() => onOpenChange(false)} />
        ) : (
          <ProductCreateForm key="new" onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}