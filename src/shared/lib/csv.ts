export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number
}

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`

/** CSV con BOM (Excel abre bien las tildes) y saltos de línea de Windows */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((column) => column.header), ...rows.map((row) => columns.map((column) => column.value(row)))]
  return `\uFEFF${lines.map((line) => line.map(csvCell).join(",")).join("\r\n")}`
}

export function downloadCsv<T>(filename: string, rows: readonly T[], columns: readonly CsvColumn<T>[]) {
  const blob = new Blob([toCsv(rows, columns)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
