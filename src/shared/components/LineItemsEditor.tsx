import type { ReactNode } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Field } from "@/shared/components/Field"
import { TotalsSummary } from "@/shared/components/TotalsSummary"
import { EntityPickerDialog } from "@/shared/components/EntityPickerDialog"
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

export interface WarehouseOption {
  id: string
  name: string
}

export interface EditableLine {
  /** Clave estable de la fila (el `id` de useFieldArray), nunca el índice */
  key: string
  product_id: string
  warehouse_id?: string
  quantity: number
  unit_price: string
}

export interface LineErrors {
  product_id?: string
  warehouse_id?: string
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
  warehouseOptionsByProduct?: Record<string, WarehouseOption[]>
  /** Al escribir en el buscador de producto se filtra el catálogo por servidor (SKU o nombre) */
  onProductSearch?: (value: string) => void
  isLoading?: boolean
  errorMessage?: string
  onProductChange: (index: number, productId: string) => void
  onWarehouseChange?: (index: number, warehouseId: string) => void
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
  warehouseOptionsByProduct,
  onProductChange,
  onWarehouseChange,
  onQuantityChange,
  onPriceChange,
  onAdd,
  onRemove,
  lineHint,
  onProductSearch,
  isLoading,
  errorMessage,
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
        const warehouseOptions = line.product_id ? warehouseOptionsByProduct?.[line.product_id] ?? [] : []
        const ids = {
          product: `line-${index}-product`,
          warehouse: `line-${index}-warehouse`,
          quantity: `line-${index}-quantity`,
          price: `line-${index}-price`,
        }
        return (
          <div
            key={line.key}
            className={`grid gap-3 rounded-md border p-3 ${
              warehouseOptionsByProduct && onWarehouseChange
                ? "md:grid-cols-[minmax(12rem,2.6fr)_minmax(12rem,2.2fr)_minmax(6rem,1fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_auto]"
                : "md:grid-cols-[minmax(14rem,3fr)_minmax(6rem,1fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_auto]"
            }`}
          >
            <Field id={ids.product} label="Producto" error={lineErrors?.product_id}>
            <EntityPickerDialog
              value={line.product_id}
              onValueChange={(value) => onProductChange(index, value)}
              options={products.map((product) => ({ value: product.id, label: `${product.sku} · ${product.name}` }))}
              placeholder="Selecciona un producto"
              searchPlaceholder="Buscar producto por SKU o nombre"
              emptyLabel="No se encontraron productos."
              disabled={disabled}
              limit={5}
              onSearchChange={onProductSearch}
              isLoading={isLoading}
              errorMessage={errorMessage}
              aria-label={`Producto ${index + 1}`}
              aria-invalid={!!lineErrors?.product_id}
              aria-describedby={describedBy(ids.product, lineErrors?.product_id)}
              className="w-full"
            />
            </Field>

            {warehouseOptionsByProduct && onWarehouseChange && (
              <Field id={ids.warehouse} label="Almacén" error={lineErrors?.warehouse_id}>
                <Select
                  value={line.warehouse_id || undefined}
                  onValueChange={(value) => onWarehouseChange(index, value)}
                  disabled={disabled || warehouseOptions.length === 0}
                >
                  <SelectTrigger
                    id={ids.warehouse}
                    className="w-full"
                    aria-invalid={!!lineErrors?.warehouse_id}
                    aria-describedby={describedBy(ids.warehouse, lineErrors?.warehouse_id)}
                  >
                    <SelectValue placeholder={line.product_id ? "Selecciona un almacén" : "Primero elige un producto"} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseOptions.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No hay almacenes con stock disponible</div>
                    ) : (
                      warehouseOptions.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            )}

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

            {lineHint && <div className={warehouseOptionsByProduct && onWarehouseChange ? "md:col-span-6" : "md:col-span-5"}>{lineHint(index)}</div>}
          </div>
        )
      })}

      <TotalsSummary preview={totals} />
    </section>
  )
}
