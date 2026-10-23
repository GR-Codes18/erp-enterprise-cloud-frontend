import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import { useCategoryOptions } from "../../categories/hooks"
import { useCreateProduct, useUpdateProduct } from "../hooks"
import {
  EMPTY_PRODUCT,
  PRODUCT_STATUSES,
  PRODUCT_UNITS,
  STATUS_LABELS,
  UNIT_LABELS,
  isSoldBelowCost,
  productCreateSchema,
  toProductUpdateInput,
  type Product,
  type ProductCreateInput,
} from "../schema"

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; un producto = editar */
  product: Product | null
}

const FIELD_NAMES = new Set<string>(Object.keys(EMPTY_PRODUCT))

/**
 * Crear y editar comparten formulario: al editar, el SKU se muestra pero no se envía
 * (es inmutable) y la categoría inactiva del producto sigue visible (regla 4).
 */
function ProductForm({ product, onDone }: { product: Product | null; onDone: () => void }) {
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const categories = useCategoryOptions({ includeId: product?.category_id })
  const isPending = createProduct.isPending || updateProduct.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: product ? { sku: product.sku, ...toProductUpdateInput(product) } : EMPTY_PRODUCT,
  })

  const [salePrice, costPrice] = useWatch({ control, name: ["sale_price", "cost_price"] })
  const belowCost = isSoldBelowCost(salePrice, costPrice)

  // Errores por campo del backend (SKU duplicado, unidad con movimientos...) junto a su campo
  const handleError = (error: unknown) => {
    const fieldErrors = isApiError(error) ? error.fieldErrors : []
    const known = fieldErrors.filter((item) => FIELD_NAMES.has(item.field))
    for (const item of known) setError(item.field as keyof ProductCreateInput, { message: item.message })
    // Si algún error no tiene campo en el formulario, nunca se falla en silencio
    if (known.length === 0 || known.length < fieldErrors.length) setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: ProductCreateInput) => {
    setServerError(null)
    const options = { onSuccess: onDone, onError: handleError }
    if (product) {
      const { sku: _immutable, ...input } = values
      void _immutable
      updateProduct.mutate({ id: product.id, input }, options)
    } else {
      createProduct.mutate(values, options)
    }
  }

  const invalid = (name: keyof ProductCreateInput) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="sku" label={product ? "SKU (no se puede cambiar)" : "SKU"} error={errors.sku?.message}>
          <Input
            id="sku"
            autoComplete="off"
            placeholder="Ej. PROD-001"
            disabled={!!product}
            {...invalid("sku")}
            {...register("sku")}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field id="name" label="Nombre del producto" error={errors.name?.message}>
            <Input id="name" autoComplete="off" placeholder="Ej. Martillo de Peña 16oz" {...invalid("name")} {...register("name")} />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="category_id" label="Categoría" error={errors.category_id?.message}>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="category_id" className="w-full" {...invalid("category_id")}>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id="unit" label="Unidad de medida" error={errors.unit?.message}>
          <Controller
            control={control}
            name="unit"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="unit"
                  className="w-full"
                  aria-invalid={!!errors.unit}
                  aria-describedby={errors.unit ? "unit-error" : product ? "unit-hint" : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {UNIT_LABELS[unit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {product && !errors.unit && (
            <p id="unit-hint" className="text-xs text-muted-foreground">
              No se puede cambiar si el producto ya tiene movimientos.
            </p>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="sale_price" label="Precio de venta (S/)" error={errors.sale_price?.message}>
          <Input id="sale_price" inputMode="decimal" placeholder="0.00" {...invalid("sale_price")} {...register("sale_price")} />
        </Field>
        <Field id="cost_price" label="Costo (S/)" error={errors.cost_price?.message}>
          <Input id="cost_price" inputMode="decimal" placeholder="0.00" {...invalid("cost_price")} {...register("cost_price")} />
        </Field>
        <Field id="min_stock" label="Stock mínimo" error={errors.min_stock?.message}>
          <Input
            id="min_stock"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            {...invalid("min_stock")}
            {...register("min_stock", { valueAsNumber: true })}
          />
        </Field>
      </div>

      {belowCost && (
        <p role="status" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text">
          Atención: el precio de venta es menor que el costo. Puedes guardarlo igual (por ejemplo, en una
          liquidación).
        </p>
      )}

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
        <Button type="button" variant="outline" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Modifica la información del producto. El SKU no se puede cambiar."
              : "Completa la información para registrar un nuevo producto."}
          </DialogDescription>
        </DialogHeader>
        <ProductForm key={product?.id ?? "new"} product={product} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
