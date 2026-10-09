import { useState } from "react"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { PeriodSelect } from "@/shared/components/PeriodSelect"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate, todayInLima } from "@/shared/lib/dates"
import { formatMoney, toCents } from "@/shared/lib/money"
import { periodRange, type PeriodPreset } from "@/shared/lib/periods"
import { GroupedBarChart, HorizontalBarChart, type SeriesDef } from "../components/charts"
import { useMonthlyReport, useTopProducts } from "../hooks"
import { monthLabel } from "../schema"

const SERIES: SeriesDef[] = [
  { key: "sales", label: "Ventas", fillClass: "fill-chart-1", swatchClass: "bg-chart-1" },
  { key: "purchases", label: "Compras", fillClass: "fill-chart-4", swatchClass: "bg-chart-4" },
]

export default function AnalyticalReportsPage() {
  const [preset, setPreset] = useState<PeriodPreset>("quarter")
  // La vista de tabla da la misma información sin depender del color (accesibilidad e impresión)
  const [asTable, setAsTable] = useState(false)
  const period = periodRange(preset, todayInLima())
  const monthly = useMonthlyReport(period)
  const top = useTopProducts(period)

  return (
    <>
      <PageHeader
        title="Reportes analíticos"
        description={`Del ${formatBusinessDate(period.date_from)} al ${formatBusinessDate(period.date_to)}. Los agregados los calcula el sistema.`}
        actions={
          <>
            <PeriodSelect value={preset} onChange={setPreset} />
            <Button variant="outline" aria-pressed={asTable} onClick={() => setAsTable((value) => !value)}>
              {asTable ? "Ver gráficos" : "Ver como tabla"}
            </Button>
          </>
        }
      />

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-md border p-4">
          {monthly.isError ? (
            <ErrorState message={getErrorMessage(monthly.error)} onRetry={() => void monthly.refetch()} />
          ) : monthly.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : asTable ? (
            <Table>
              <caption className="mb-2 text-left font-medium">Ventas y compras por mes</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.data.map((point) => (
                  <TableRow key={point.month}>
                    <TableCell>{monthLabel(point.month)}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(point.sales)}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(point.purchases)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <GroupedBarChart
              title="Ventas y compras por mes"
              series={SERIES}
              groups={monthly.data.map((point) => ({
                key: point.month,
                label: monthLabel(point.month),
                values: { sales: toCents(point.sales), purchases: toCents(point.purchases) },
              }))}
            />
          )}
        </section>

        <section className="rounded-md border p-4">
          {top.isError ? (
            <ErrorState message={getErrorMessage(top.error)} onRetry={() => void top.refetch()} />
          ) : top.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : top.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hubo ventas en el periodo.</p>
          ) : asTable ? (
            <Table>
              <caption className="mb-2 text-left font-medium">Productos más vendidos</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Monto sin IGV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.data.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell>{product.product_name}</TableCell>
                    <TableCell className="text-right font-mono">{product.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(product.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <HorizontalBarChart
              title="Productos más vendidos (monto sin IGV)"
              fillClass="fill-chart-1"
              bars={top.data.map((product) => ({
                key: product.product_id,
                label: product.product_name,
                cents: toCents(product.amount),
                detail: `${product.quantity} unidades`,
              }))}
            />
          )}
        </section>
      </div>
    </>
  )
}
