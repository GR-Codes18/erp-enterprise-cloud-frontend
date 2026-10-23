import { Download } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { downloadCsv, type CsvColumn } from "@/shared/lib/csv"

interface ExportCsvButtonProps<T> {
  /** Nombre base del archivo, ej. "clientes" (se le agrega la fecha) */
  filename: string
  rows: readonly T[]
  columns: readonly CsvColumn<T>[]
}

/** Descarga en CSV los registros que se ven en pantalla (la página actual con sus filtros) */
export function ExportCsvButton<T>({ filename, rows, columns }: ExportCsvButtonProps<T>) {
  return (
    <Button
      variant="outline"
      disabled={rows.length === 0}
      title="Descarga en CSV los registros de la página actual"
      onClick={() => downloadCsv(filename, rows, columns)}
    >
      <Download aria-hidden="true" />
      Exportar CSV
    </Button>
  )
}
