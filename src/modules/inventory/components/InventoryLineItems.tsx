import { Plus, Trash2 } from "lucide-react"
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
import type { ProductChoice } from "@/shared/lib/options"

type AdjustmentDirection = "increase" | "decrease"

export interface InventoryLine {
  product_id: string
  quantity: number
  direction?: AdjustmentDirection
}

interface InventoryLineItemsProps {
  lines: InventoryLine[]
  products: ProductChoice[]
  availability: Record<string, number>
  /** Productos cuyo disponible no se pudo consultar */
  availabilityFailed?: string[]
  /** Sin almacén elegido no hay disponible que mostrar */
  warehouseSelected: boolean
  mode: "transfer" | "adjustment"
  itemErrors: Array<{ product_id?: string; quantity?: string; direction?: string }>
  listError?: string
  disabled?: boolean
  onProductChange: (index: number, value: string) => void
  onQuantityChange: (index: number, value: number) => void
  onDirectionChange: (index: number, value: AdjustmentDirection) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

export function InventoryLineItems({
  lines,
  products,
  availability,
  availabilityFailed = [],
  warehouseSelected,
  mode,
  itemErrors,
  listError,
  disabled = false,
  onProductChange,
  onQuantityChange,
  onDirectionChange,
  onAdd,
  onRemove,
}: InventoryLineItemsProps) {
  const isAdjustment = mode === "adjustment"

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Productos</h2>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onAdd}>
          <Plus aria-hidden="true" />
          Agregar producto
        </Button>
      </div>
      {listError && <p role="alert" className="text-sm text-destructive">{listError}</p>}

      {lines.map((line, index) => {
        const errors = itemErrors[index]
        const available = availability[line.product_id]
        return (
          <div
            key={index}
            className={`grid gap-3 rounded-md border p-3 ${
              isAdjustment
                ? "md:grid-cols-[minmax(12rem,2fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto]"
                : "md:grid-cols-[minmax(12rem,2fr)_minmax(8rem,1fr)_auto]"
            }`}
          >
            <Field id={`item-${index}-product`} label="Producto" error={errors?.product_id}>
              <Select
                value={line.product_id || undefined}
                onValueChange={(value) => onProductChange(index, value)}
                disabled={disabled}
              >
                <SelectTrigger id={`item-${index}-product`} className="w-full" aria-invalid={!!errors?.product_id}>
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

            {isAdjustment && (
              <Field id={`item-${index}-direction`} label="Tipo" error={errors?.direction}>
                <Select
                  value={line.direction ?? "increase"}
                  onValueChange={(value) => {
                    if (value === "increase" || value === "decrease") onDirectionChange(index, value)
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger id={`item-${index}-direction`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Aumento</SelectItem>
                    <SelectItem value="decrease">Disminución</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field id={`item-${index}-quantity`} label="Cantidad" error={errors?.quantity}>
              <Input
                id={`item-${index}-quantity`}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={Number.isNaN(line.quantity) ? "" : line.quantity}
                aria-invalid={!!errors?.quantity}
                onChange={(event) =>
                  onQuantityChange(index, event.target.value === "" ? Number.NaN : Number(event.target.value))
                }
                disabled={disabled}
              />
            </Field>

            <div className="flex items-end gap-3">
              {line.product_id && (
                <p className="pb-2 text-xs text-muted-foreground">
                  {!warehouseSelected
                    ? "Elige un almacén para ver el disponible"
                    : availabilityFailed.includes(line.product_id)
                      ? "Disponible: no se pudo consultar"
                      : `Disponible: ${available === undefined ? "cargando…" : available}`}
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-1"
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
