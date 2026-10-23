import type { ReactNode } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Field } from "@/shared/components/Field"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { EntityPickerDialog } from "@/shared/components/EntityPickerDialog"

export interface QuantityLine {
  /** Clave estable de la fila (el `id` de useFieldArray), nunca el índice */
  key: string
  product_id: string
  quantity: number
}

interface QuantityLinesEditorProps {
  title: string
  lines: QuantityLine[]
  /** Productos que se pueden elegir (ej. los de la orden o la recepción) */
  products: { id: string; label: string }[]
  errors: ({ product_id?: string; quantity?: string } | undefined)[]
  listError?: string
  disabled?: boolean
  emptyMessage?: string
  /** Al escribir en el buscador de producto se filtra el catálogo por servidor (SKU o nombre) */
  onProductSearch?: (value: string) => void
  isLoading?: boolean
  errorMessage?: string
  onProductChange: (index: number, productId: string) => void
  onQuantityChange: (index: number, quantity: number) => void
  onAdd: () => void
  onRemove: (index: number) => void
  /** Ayuda bajo la cantidad, ej. "Pendientes: 6" */
  quantityHint?: (index: number) => ReactNode
}

/** Líneas de producto y cantidad, sin precio: solicitudes, recepciones y devoluciones */
export function QuantityLinesEditor({
  title,
  lines,
  products,
  errors,
  listError,
  disabled = false,
  emptyMessage,
  onProductChange,
  onQuantityChange,
  onAdd,
  onRemove,
  quantityHint,
  onProductSearch,
  isLoading,
  errorMessage,
}: QuantityLinesEditorProps) {
  return (
    <section className="space-y-3" aria-labelledby="quantity-lines-title">
      <div className="flex items-center justify-between">
        <h2 id="quantity-lines-title" className="text-base font-medium">
          {title}
        </h2>
        <Button type="button" variant="outline" size="sm" disabled={disabled || lines.length >= products.length} onClick={onAdd}>
          <Plus aria-hidden="true" />
          Agregar producto
        </Button>
      </div>
      {listError && (
        <p role="alert" className="text-sm text-danger-text">
          {listError}
        </p>
      )}
      {lines.length === 0 && emptyMessage && <p className="text-sm text-muted-foreground">{emptyMessage}</p>}

      {lines.map((line, index) => {
        const lineErrors = errors[index]
        const ids = { product: `qty-line-${index}-product`, quantity: `qty-line-${index}-quantity` }
        const hint = quantityHint?.(index)
        return (
          <div key={line.key} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(14rem,3fr)_minmax(8rem,1fr)_auto]">
            <Field id={ids.product} label="Producto" error={lineErrors?.product_id}>
              <EntityPickerDialog
                value={line.product_id}
                onValueChange={(value) => onProductChange(index, value)}
                options={products.map((product) => ({ value: product.id, label: product.label }))}
                placeholder="Selecciona un producto"
                searchPlaceholder="Buscar producto por SKU o nombre"
                emptyLabel="No se encontraron productos."
                disabled={disabled}
                onSearchChange={onProductSearch}
                isLoading={isLoading}
                errorMessage={errorMessage}
                aria-label={`Producto ${index + 1}`}
                aria-invalid={!!lineErrors?.product_id}
                aria-describedby={lineErrors?.product_id ? `${ids.product}-error` : undefined}
                className="w-full"
              />
            </Field>
            <Field id={ids.quantity} label="Cantidad" error={lineErrors?.quantity}>
              <Input
                id={ids.quantity}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                disabled={disabled}
                value={Number.isNaN(line.quantity) ? "" : line.quantity}
                aria-invalid={!!lineErrors?.quantity}
                aria-describedby={lineErrors?.quantity ? `${ids.quantity}-error` : hint ? `${ids.quantity}-hint` : undefined}
                onChange={(event) => onQuantityChange(index, event.target.value === "" ? Number.NaN : Number(event.target.value))}
              />
              {hint && !lineErrors?.quantity && (
                <p id={`${ids.quantity}-hint`} className="text-xs text-muted-foreground">
                  {hint}
                </p>
              )}
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar producto ${index + 1}`}
                disabled={disabled}
                onClick={() => onRemove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        )
      })}
    </section>
  )
}
