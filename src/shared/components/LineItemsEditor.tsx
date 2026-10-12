import type { ReactNode } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Field } from "@/shared/components/Field"
import { TotalsSummary } from "@/shared/components/TotalsSummary"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { lineSubtotalCents, previewTotals } from "@/shared/lib/lines"
import { formatCents } from "@/shared/lib/money"

export interface LineProductOption {
  id: string
  sku: string
  name: string
  unit: string
}

export interface EditableLine {
  /** Clave estable de la fila (el `id` de useFieldArray), nunca el índice */
  key: string
  product_id: string
  quantity: number
  unit_price: string
}

export interface LineErrors {
  product_id?: string
  quantity?: string
  unit_price?: string
}

interface LineItemsEditorProps {
  lines: EditableLine[]
  /** Productos que se pueden elegir (activos, más los que el documento ya tiene) */
  products: LineProductOption[]
  /** "Precio unitario (S/)" en ventas, "Costo unitario (S/)" en compras */
  priceLabel: string
  errors: (LineErrors | undefined)[]
  /** Error de la lista completa (sin líneas, productos repetidos...) */
  listError?: string
  disabled?: boolean
  /** Al elegir un producto la página propone su precio o costo (editable) */
  onProductChange: (index: number, productId: string) => void
  onQuantityChange: (index: number, quantity: number) => void
  onPriceChange: (index: number, price: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  /** Información extra bajo cada línea, ej. el stock disponible */
  lineHint?: (index: number) => ReactNode
}

/**
 * Editor de líneas de producto para documentos (cotizaciones, pedidos, órdenes de compra...).
 * Cada línea: producto, cantidad, precio y subtotal; abajo, la vista previa de los totales con IGV.
 * Todo el cálculo es en centavos (shared/lib/lines.ts): el total oficial lo da el backend.
 */
export function LineItemsEditor({
  lines,
  products,
  priceLabel,
  errors,
  listError,
  disabled = false,
  onProductChange,
  onQuantityChange,
  onPriceChange,
  onAdd,
  onRemove,
  lineHint,
}: LineItemsEditorProps) {
  const totals = previewTotals(lines)
  const describedBy = (id: string, error?: string) => (error ? `${id}-error` : undefined)

  return (
    <section className="space-y-3" aria-labelledby="line-items-title">
      <div className="flex items-center justify-between">
        <h2 id="line-items-title" className="text-base font-medium">
          Productos
        </h2>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onAdd}>
          <Plus aria-hidden="true" />
          Agregar producto
        </Button>
      </div>
      {listError && (
        <p role="alert" className="text-sm text-danger-text">
          {listError}
        </p>
      )}

      {lines.map((line, index) => {
        const lineErrors = errors[index]
        const subtotal = lineSubtotalCents(line)
        const unit = products.find((product) => product.id === line.product_id)?.unit
        const ids = {
          product: `line-${index}-product`,
          quantity: `line-${index}-quantity`,
          price: `line-${index}-price`,
        }
        return (
          <div
            key={line.key}
            className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(14rem,3fr)_minmax(6rem,1fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_auto]"
          >
            <Field id={ids.product} label="Producto" error={lineErrors?.product_id}>
              <Select
                value={line.product_id || undefined}
                onValueChange={(value) => onProductChange(index, value)}
                disabled={disabled}
              >
                <SelectTrigger
                  id={ids.product}
                  className="w-full"
                  aria-invalid={!!lineErrors?.product_id}
                  aria-describedby={describedBy(ids.product, lineErrors?.product_id)}
                >
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} · {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id={ids.quantity} label={unit ? `Cantidad (${unit})` : "Cantidad"} error={lineErrors?.quantity}>
              <Input
                id={ids.quantity}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                disabled={disabled}
                value={Number.isNaN(line.quantity) ? "" : line.quantity}
                aria-invalid={!!lineErrors?.quantity}
                aria-describedby={describedBy(ids.quantity, lineErrors?.quantity)}
                onChange={(event) =>
                  onQuantityChange(index, event.target.value === "" ? Number.NaN : Number(event.target.value))
                }
              />
            </Field>

            <Field id={ids.price} label={priceLabel} error={lineErrors?.unit_price}>
              <Input
                id={ids.price}
                inputMode="decimal"
                placeholder="0.00"
                disabled={disabled}
                value={line.unit_price}
                aria-invalid={!!lineErrors?.unit_price}
                aria-describedby={describedBy(ids.price, lineErrors?.unit_price)}
                onChange={(event) => onPriceChange(index, event.target.value)}
              />
            </Field>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Subtotal</span>
              <span className="flex h-9 items-center font-mono text-sm" aria-live="polite">
                {subtotal === null ? "—" : formatCents(subtotal)}
              </span>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar producto ${index + 1}`}
                disabled={disabled || lines.length === 1}
                onClick={() => onRemove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>

            {lineHint && <div className="md:col-span-5">{lineHint(index)}</div>}
          </div>
        )
      })}

      <TotalsSummary preview={totals} />
    </section>
  )
}
