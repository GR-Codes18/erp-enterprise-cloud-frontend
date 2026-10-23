import type { ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { lineSubtotalCents } from "@/shared/lib/lines"
import { formatCents, formatMoney } from "@/shared/lib/money"

export interface ReadOnlyLine {
  product_id: string
  product_name: string
  quantity: number
  unit_price: string
}

interface DocumentLinesTableProps<T extends ReadOnlyLine> {
  lines: T[]
  /** "Precio unitario" en ventas, "Costo unitario" en compras */
  priceLabel?: string
  /** Columna adicional, ej. "Devuelto" o "Recibido" */
  extraColumn?: { header: string; cell: (line: T) => ReactNode }
}

/** Líneas de un documento en modo lectura: producto, cantidad, precio y subtotal */
export function DocumentLinesTable<T extends ReadOnlyLine>({
  lines,
  priceLabel = "Precio unitario",
  extraColumn,
}: DocumentLinesTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            {extraColumn && <TableHead className="text-right">{extraColumn.header}</TableHead>}
            <TableHead className="text-right">{priceLabel}</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const subtotal = lineSubtotalCents(line)
            return (
              <TableRow key={line.product_id}>
                <TableCell className="font-medium">{line.product_name}</TableCell>
                <TableCell className="text-right font-mono">{line.quantity}</TableCell>
                {extraColumn && <TableCell className="text-right font-mono">{extraColumn.cell(line)}</TableCell>}
                <TableCell className="text-right font-mono">{formatMoney(line.unit_price)}</TableCell>
                <TableCell className="text-right font-mono">{subtotal === null ? "—" : formatCents(subtotal)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
