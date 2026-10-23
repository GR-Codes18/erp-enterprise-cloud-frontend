import { useMemo, useState } from "react"
import { ArrowDownToLine, BarChart3, Banknote, Boxes, CalendarDays, ShoppingCart, Table2 } from "lucide-react"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ErrorState } from "@/shared/components/ErrorState"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { addDays, todayInLima } from "@/shared/lib/dates"
import { formatCents, formatMoney, toCents } from "@/shared/lib/money"
import type { Period } from "@/shared/lib/periods"
import { GroupedBarChart, HorizontalBarChart, type SeriesDef } from "../components/charts"
import { useMonthlyReport, useTopProducts } from "../hooks"
import { monthLabel } from "../schema"

const SERIES: SeriesDef[] = [
  { key: "sales", label: "Ventas", fillClass: "fill-chart-1", swatchClass: "bg-chart-1" },
  { key: "purchases", label: "Compras", fillClass: "fill-chart-4", swatchClass: "bg-chart-4" },
]
type Preset = "7" | "30" | "90" | "custom"

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Banknote; tone: "blue" | "green" | "teal" }) {
  const tones = { blue: "bg-blue-50 text-blue-600", green: "bg-amber-50 text-amber-600", teal: "bg-teal-50 text-teal-600" }
  return <article className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}><Icon aria-hidden="true" className="size-[18px]" /></span></div><p className="mt-3 truncate font-mono text-2xl font-semibold tracking-tight" title={value}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>
}

function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"` }

export default function AnalyticalReportsPage() {
  const today = todayInLima()
  const [preset, setPreset] = useState<Preset>("90")
  const [customFrom, setCustomFrom] = useState(addDays(today, -29))
  const [customTo, setCustomTo] = useState(today)
  const [asTable, setAsTable] = useState(false)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"amount" | "quantity">("amount")

  const period = useMemo<Period>(() => preset === "custom"
    ? { date_from: customFrom, date_to: customTo }
    : { date_from: addDays(today, -(Number(preset) - 1)), date_to: today }, [preset, customFrom, customTo, today])
  const invalidCustomRange = preset === "custom" && (!customFrom || !customTo || customFrom > customTo)
  const monthly = useMonthlyReport(period, !invalidCustomRange)
  const top = useTopProducts(period, !invalidCustomRange)
  const products = useMemo(() => [...(top.data ?? [])]
    .filter((item) => `${item.product_name} ${item.product_id}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => sortBy === "amount" ? toCents(b.amount) - toCents(a.amount) : b.quantity - a.quantity), [top.data, search, sortBy])
  const salesCents = (monthly.data ?? []).reduce((sum, point) => sum + toCents(point.sales), 0)
  const purchasesCents = (monthly.data ?? []).reduce((sum, point) => sum + toCents(point.purchases), 0)
  const topQuantity = (top.data ?? []).reduce((sum, item) => sum + item.quantity, 0)
  const monthBuckets = monthly.data?.length ?? 0
  const averageMonthlySales = monthBuckets ? Math.round(salesCents / monthBuckets) : 0

  const exportCsv = () => {
    const rows = [
      ["Tipo", "Periodo", "Concepto", "Cantidad", "Ventas", "Compras"],
      ...(monthly.data ?? []).map((point) => ["Resumen mensual", monthLabel(point.month), "", "", point.sales, point.purchases]),
      ...products.map((item) => ["Producto más vendido", `${period.date_from} - ${period.date_to}`, item.product_name, String(item.quantity), item.amount, ""]),
    ]
    const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `reporte-analitico-${period.date_from}-${period.date_to}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="space-y-6">
    <PageHeader title="Reportes analíticos" description="Explora la evolución de ventas, compras y productos más vendidos." actions={
      <Button variant="outline" onClick={exportCsv} disabled={monthly.isPending || top.isPending || monthly.isError || top.isError || invalidCustomRange}><ArrowDownToLine aria-hidden="true" /> Exportar CSV</Button>
    } />

    <section aria-label="Filtros del análisis" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 pb-1 text-sm font-medium"><CalendarDays aria-hidden="true" className="size-4 text-primary" />Periodo</div>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Periodo rápido">
        {([["7", "7 días"], ["30", "30 días"], ["90", "90 días"], ["custom", "Personalizado"]] as const).map(([value, label]) => <Button key={value} size="sm" variant={preset === value ? "default" : "ghost"} aria-pressed={preset === value} onClick={() => setPreset(value)}>{label}</Button>)}
      </div>
      {preset === "custom" && <div className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-xs text-muted-foreground">Desde<Input type="date" className="w-40" value={customFrom} max={customTo || today} onChange={(event) => setCustomFrom(event.target.value)} /></label><label className="grid gap-1 text-xs text-muted-foreground">Hasta<Input type="date" className="w-40" value={customTo} min={customFrom} max={today} onChange={(event) => setCustomTo(event.target.value)} /></label></div>}
      <p className="ml-auto text-xs text-muted-foreground">{period.date_from} — {period.date_to}</p>
    </section>

    {invalidCustomRange ? <p role="alert" className="text-sm text-destructive">Selecciona un rango de fechas válido.</p> : <>
      <section aria-label="Indicadores del periodo" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {monthly.isError ? <div className="sm:col-span-2"><ErrorState message={getErrorMessage(monthly.error)} onRetry={() => void monthly.refetch()} /></div> : monthly.isPending ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />) : <>
          <StatCard label="Ventas del periodo" value={formatCents(salesCents)} detail="Suma de la serie mensual" icon={Banknote} tone="blue" />
          <StatCard label="Compras del periodo" value={formatCents(purchasesCents)} detail="Suma de la serie mensual" icon={ShoppingCart} tone="green" />
          <StatCard label="Promedio mensual de ventas" value={formatCents(averageMonthlySales)} detail={`Promedio de ${monthBuckets} ${monthBuckets === 1 ? "mes" : "meses"} analizados`} icon={Banknote} tone="teal" />
        </>}
        {top.isError ? <ErrorState message={getErrorMessage(top.error)} onRetry={() => void top.refetch()} /> : top.isPending ? <Skeleton className="h-32 w-full" /> : <StatCard label="Unidades en el top 5" value={String(topQuantity)} detail="Unidades vendidas entre los productos líderes" icon={Boxes} tone="teal" />}
      </section>

      <section aria-label="Análisis de ventas y productos" className="grid items-stretch gap-4 xl:grid-cols-5">
        <article className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-5 xl:col-span-3">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Ventas y compras</h2><p className="mt-1 text-xs text-muted-foreground">Importes mensuales del periodo · moneda PEN</p></div><ViewToggle asTable={asTable} setAsTable={setAsTable} /></div>
          {monthly.isError ? <ErrorState message={getErrorMessage(monthly.error)} onRetry={() => void monthly.refetch()} /> : monthly.isPending ? <Skeleton className="h-72 w-full" /> : (monthly.data ?? []).length === 0 ? <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No hay datos para el periodo seleccionado.</p> : asTable ? <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead className="bg-muted text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Mes</th><th className="px-3 py-2 text-right">Ventas</th><th className="px-3 py-2 text-right">Compras</th></tr></thead><tbody className="divide-y">{(monthly.data ?? []).map((point) => <tr key={point.month}><td className="px-3 py-2">{monthLabel(point.month)}</td><td className="px-3 py-2 text-right font-mono">{formatMoney(point.sales)}</td><td className="px-3 py-2 text-right font-mono">{formatMoney(point.purchases)}</td></tr>)}</tbody></table></div> : <GroupedBarChart title="Ventas y compras por mes" series={SERIES} groups={(monthly.data ?? []).map((point) => ({ key: point.month, label: monthLabel(point.month), values: { sales: toCents(point.sales), purchases: toCents(point.purchases) } }))} />}
          <p className="mt-3 text-[11px] text-muted-foreground">La fuente analítica entrega los importes agrupados por mes; no ofrece detalle diario o semanal.</p>
        </article>

        <article className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Productos más vendidos</h2><p className="mt-1 text-xs text-muted-foreground">Top 5 por venta neta · monto sin IGV</p></div><ViewToggle asTable={asTable} setAsTable={setAsTable} /></div>
          {top.isError ? <ErrorState message={getErrorMessage(top.error)} onRetry={() => void top.refetch()} /> : top.isPending ? <Skeleton className="h-72 w-full" /> : (top.data ?? []).length === 0 ? <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No hubo ventas de productos en el periodo.</div> : <>
            <label className="mb-3 block"><span className="sr-only">Buscar productos</span><Input type="search" placeholder="Buscar producto..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            {products.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No hay productos que coincidan con la búsqueda.</p> : asTable ? <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead className="bg-muted text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right"><button onClick={() => setSortBy("quantity")} className="hover:text-foreground">Unidades{sortBy === "quantity" ? " ↓" : ""}</button></th><th className="px-3 py-2 text-right"><button onClick={() => setSortBy("amount")} className="hover:text-foreground">Venta{sortBy === "amount" ? " ↓" : ""}</button></th></tr></thead><tbody className="divide-y">{products.map((product) => <tr key={product.product_id}><td className="max-w-56 truncate px-3 py-2" title={product.product_name}>{product.product_name}</td><td className="px-3 py-2 text-right font-mono">{product.quantity}</td><td className="px-3 py-2 text-right font-mono">{formatMoney(product.amount)}</td></tr>)}</tbody></table></div> : <HorizontalBarChart title="Ventas netas por producto" fillClass="fill-chart-2" bars={products.map((product) => ({ key: product.product_id, label: product.product_name, cents: toCents(product.amount), detail: `${product.quantity} unidades` }))} />}
          </>}
        </article>
      </section>
    </>}
  </div>
}

function ViewToggle({ asTable, setAsTable }: { asTable: boolean; setAsTable: (value: boolean) => void }) {
  return <Button size="sm" variant="outline" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>{asTable ? <><BarChart3 aria-hidden="true" /> Ver gráficos</> : <><Table2 aria-hidden="true" /> Ver tabla</>}</Button>
}
