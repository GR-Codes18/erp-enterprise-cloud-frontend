import type { ReactNode } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Skeleton } from "@/shared/components/ui/skeleton"

export interface Column<T> {
  /** Identificador único de la columna */
  key: string
  header: string
  /** Cómo se dibuja la celda a partir de la fila */
  cell: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  isLoading?: boolean
  skeletonRows?: number
  /** Qué mostrar cuando no hay filas (normalmente un EmptyState) */
  empty?: ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  skeletonRows = 5,
  empty,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card" aria-busy={isLoading}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRows }, (_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>{empty}</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={getRowKey(row)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}