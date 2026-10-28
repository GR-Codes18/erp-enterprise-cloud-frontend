import { useState } from "react"
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Banknote, Boxes, CalendarDays, CheckCircle2, ClipboardList, Package, Plus, Search, ShoppingCart, WalletCards } from "lucide-react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { useOrders } from "@/modules/sales/hooks"
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/modules/sales/orders/schema"
import { useMonthlyReport } from "@/modules/reports/hooks"
import { monthLabel } from "@/modules/reports/schema"
import { ErrorState } from "@/shared/components/ErrorState"
import { PeriodSelect } from "@/shared/components/PeriodSelect"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Input } from "@/shared/components/ui/input"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate, formatDateTimeLima, todayInLima } from "@/shared/lib/dates"
import { formatCents, formatMoney, toCents } from "@/shared/lib/money"
import { periodRange, type PeriodPreset } from "@/shared/lib/periods"
import { useDashboard } from "../hooks"

function MetricCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: string; detail: string; icon: typeof Banknote; tone?: "blue" | "green" | "slate" | "amber" }) {
  const iconTone = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", slate: "bg-slate-100 text-slate-500", amber: "bg-amber-50 text-amber-600" }[tone]
  return <article className="relative min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-[18px]">
    <span className={`absolute right-4 top-4 flex size-8 items-center justify-center rounded-md ${iconTone}`}><Icon aria-hidden="true" className="size-4" /></span>
    <p className="pr-10 text-xs font-medium text-slate-500">{label}</p><p className="mt-3 truncate text-[26px] font-semibold leading-none tracking-tight text-slate-900" title={value}>{value}</p><p className="mt-3 text-[11px] leading-4 text-slate-500">{detail}</p>
  </article>
}

function SalesPurchasesChart({ points }: { points: { month: string; sales: string; purchases: string }[] }) {
  const width = 760, height = 230, left = 42, right = 12, top = 14, bottom = 28
  const plotW = width - left - right, plotH = height - top - bottom
  const max = Math.max(1, ...points.flatMap((p) => [toCents(p.sales), toCents(p.purchases)]))
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const ceiling = Math.ceil(max / step) * step
  const y = (v: number) => top + plotH - (v / ceiling) * plotH
  const x = (i: number) => left + (points.length < 2 ? plotW / 2 : i * plotW / (points.length - 1))
  const line = (key: "sales" | "purchases") => points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(toCents(p[key]))}`).join(" ")
  const ticks = [0, ceiling / 4, ceiling / 2, ceiling * 3 / 4, ceiling]
  const compact = (cents: number) => cents === 0 ? "0" : `${Math.round(cents / 10000) / 100}k`
  return <figure className="min-w-0">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">Ventas y compras</h3><p className="mt-1 text-[11px] text-slate-500">Evolución del periodo seleccionado</p></div><div className="flex gap-4 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-blue-600" />Ventas</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-teal-500" />Compras</span></div></div>
    {points.length === 0 ? <div className="flex h-56 items-center justify-center text-sm text-slate-500">No hay movimientos en este periodo.</div> : <div className="w-full overflow-hidden"><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Gráfico de líneas de ventas y compras por mes">
      {ticks.map((t) => <g key={t}><line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke="#dbe4ee" strokeDasharray="2 4" /><text x={left - 7} y={y(t) + 3} textAnchor="end" fill="#64748b" fontSize="9">{compact(t)}</text></g>)}
      <path d={`${line("sales")} L${x(points.length - 1)},${top + plotH} L${x(0)},${top + plotH} Z`} fill="#2563eb" opacity=".06" />
      <path d={line("sales")} fill="none" stroke="#0969f5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={line("purchases")} fill="none" stroke="#27aaa5" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <text key={p.month} x={x(i)} y={height - 7} textAnchor="middle" fill="#64748b" fontSize="9">{monthLabel(p.month)}</text>)}
    </svg></div>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-[11px]"><span className="text-slate-500">Total ventas <b className="ml-1 text-slate-900">{formatCents(points.reduce((n, p) => n + toCents(p.sales), 0))}</b></span><span className="text-slate-500">Total compras <b className="ml-1 text-slate-900">{formatCents(points.reduce((n, p) => n + toCents(p.purchases), 0))}</b></span></div>
  </figure>
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<PeriodPreset>("quarter")
  const [search, setSearch] = useState("")
  const period = periodRange(preset, todayInLima())
  const dashboard = useDashboard(period)
  const canSeeStock = useHasPermission("inventory.stock:view")
  const canSeeOrders = useHasPermission("sales.orders:view")
  const canCreateOrders = useHasPermission("sales.orders:create")
  const canSeePurchases = useHasPermission("purchases.orders:view")
  const canSeeReceptions = useHasPermission("purchases.receptions:view")
  const canSeeAnalytics = useHasPermission("reports.analytics:view")
  const canSeeReceivables = useHasPermission("finance.receivables:view")
  const canSeePayables = useHasPermission("finance.payables:view")
  const monthly = useMonthlyReport(period, canSeeAnalytics)
  const orders = useOrders({ page: 1, size: 7, search: search.trim() }, canSeeOrders)
  const lowStock = dashboard.data?.alerts.low_stock ?? []
  const visibleLowStock = lowStock.slice(0, 4)

  const exportSummary = () => {
    if (!dashboard.data) return
    const data = dashboard.data
    const csv = [
      ["Indicador", "Valor", "Periodo"],
      ["Ventas netas", data.sales, `${data.date_from} - ${data.date_to}`],
      ["Compras", data.purchases, `${data.date_from} - ${data.date_to}`],
      ...(canSeeStock ? [["Stock crítico", String(data.critical_stock_count), `${data.date_from} - ${data.date_to}`]] : []),
      ...(canSeeOrders ? [["Pedidos por facturar", String(data.alerts.orders_to_invoice.length), `${data.date_from} - ${data.date_to}`]] : []),
    ].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }))
    link.download = `panel-${data.date_from}-${data.date_to}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  if (dashboard.isError) return <ErrorState message={getErrorMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
  if (dashboard.isPending) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-lg border bg-white" />)}</div>
  const data = dashboard.data
  const pendingOrders = data.alerts.orders_to_invoice.length
  const alertCount = canSeeStock ? lowStock.length : 0

  return <div className="space-y-[18px] pb-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Panel de control</h1><p className="mt-1 text-xs text-slate-500">Resumen del negocio, alertas y tareas pendientes en un solo lugar.</p></div>
      <div className="flex flex-wrap items-center gap-2"><CalendarDays className="size-4 text-slate-500" /><PeriodSelect value={preset} onChange={setPreset} /><button type="button" onClick={exportSummary} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"><ArrowDownToLine className="size-3.5" /> Exportar</button></div>
    </header>

    <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Ventas totales" value={formatMoney(data.sales)} detail={`Periodo ${formatBusinessDate(data.date_from)} – ${formatBusinessDate(data.date_to)}`} icon={Banknote} />
      <MetricCard label="Compras totales" value={formatMoney(data.purchases)} detail="Facturas de proveedor no anuladas" icon={ShoppingCart} tone="green" />
      <MetricCard label="Productos en stock crítico" value={canSeeStock ? String(data.critical_stock_count) : "—"} detail={canSeeStock ? `${alertCount} alertas de inventario` : "Sin acceso a inventario"} icon={Boxes} tone="slate" />
      <MetricCard label="Órdenes pendientes" value={canSeeOrders ? String(pendingOrders) : "—"} detail={canSeeOrders ? "Pedidos confirmados por facturar" : "Sin acceso a pedidos"} icon={ClipboardList} tone="amber" />
    </section>

    <section className="grid items-stretch gap-4 xl:grid-cols-3">
      <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5 xl:col-span-2">{canSeeAnalytics ? <>{monthly.isPending ? <div className="h-64 animate-pulse rounded bg-slate-50" /> : <SalesPurchasesChart points={monthly.data ?? []} />}{monthly.isError && <ErrorState message={getErrorMessage(monthly.error)} onRetry={() => void monthly.refetch()} />}</> : <div className="flex h-64 items-center justify-center text-sm text-slate-500">No tienes permiso para consultar el análisis mensual.</div>}</div>
      <section aria-label="Alertas de inventario" className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.035)]">
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5"><div><h2 className="text-sm font-semibold text-slate-900">Alertas de inventario</h2><p className="mt-1 text-[11px] text-slate-500">Productos que necesitan atención</p></div><span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">{alertCount} alertas</span></div>
        <div className="divide-y divide-slate-200">{canSeeStock && visibleLowStock.map((item) => <div key={item.product_id} className="flex items-center gap-3 px-4 py-3 sm:px-5"><span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500"><Package className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-800">{item.product_name}</p><p className="mt-1 text-[10px] text-slate-500">{item.product_id} · Mínimo: {item.min_stock} {item.unit}</p></div><div className="shrink-0 text-right"><p className="text-xs font-medium text-amber-700">{item.stock} {item.unit}</p><p className="mt-1 text-[10px] text-slate-500">Stock bajo</p></div></div>)}{visibleLowStock.length === 0 && <div className="flex items-center gap-2 px-5 py-6 text-xs text-emerald-700">{canSeeStock ? <><CheckCircle2 className="size-4" /> Sin productos bajo mínimo.</> : "No tienes permiso para consultar inventario."}</div>}</div>
        {canSeeStock && <Link to="/inventory/stock" className="mt-auto flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500 hover:bg-slate-50 sm:px-5">Revisar reposición de productos <ArrowRight className="size-4 text-blue-600" /></Link>}
      </section>
    </section>

    <section className="grid items-start gap-4 xl:grid-cols-3">
      {canSeeOrders && <section aria-label="Órdenes de venta recientes" className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.035)] xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5"><div><h2 className="text-sm font-semibold text-slate-900">Órdenes de venta recientes</h2><p className="mt-1 text-[11px] text-slate-500">Últimos movimientos comerciales</p></div>{canSeeOrders && <Link to="/sales/orders" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">Ver todas <ArrowUpRight className="size-3.5" /></Link>}</div>
        <div className="flex items-center justify-between gap-3 px-4 pb-3 sm:px-5"><label className="relative block w-full max-w-xs"><Search aria-hidden="true" className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" /><Input type="search" placeholder="Buscar por orden o cliente..." aria-label="Buscar órdenes recientes" className="h-8 pl-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} /></label><span className="shrink-0 text-[10px] text-slate-500">{orders.data?.total ?? 0} registros</span></div>
        {orders.isError ? <div className="p-4"><ErrorState message={getErrorMessage(orders.error)} onRetry={() => void orders.refetch()} /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left text-[11px]"><thead className="bg-slate-100"><tr className="text-slate-500"><th className="px-4 py-3 font-medium sm:px-5">N.º de orden</th><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 text-right font-medium">Importe total</th><th className="px-4 py-3 font-medium">Estado</th></tr></thead><tbody className="divide-y divide-slate-200">{(orders.data?.items ?? []).map((order) => <tr key={order.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono text-slate-700 sm:px-5"><Link className="hover:text-blue-600" to={`/sales/orders/${order.id}`}>{order.number}</Link></td><td className="max-w-44 truncate px-4 py-3 text-slate-700">{order.customer_name || order.buyer_name || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTimeLima(order.created_at)}</td><td className="whitespace-nowrap px-4 py-3 text-right font-mono text-slate-800">{formatMoney(order.total)}</td><td className="px-4 py-3"><StatusBadge tone={ORDER_STATUS_TONES[order.status]} label={ORDER_STATUS_LABELS[order.status]} /></td></tr>)}{!orders.isPending && (orders.data?.items.length ?? 0) === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No se encontraron órdenes.</td></tr>}</tbody></table></div>}
      </section>}
      <section aria-label="Accesos rápidos" className={`rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5 ${!canSeeOrders ? "xl:col-span-3" : ""}`}><h2 className="text-sm font-semibold text-slate-900">Accesos rápidos</h2><p className="mt-1 text-[11px] text-slate-500">Operaciones frecuentes</p><div className="mt-3 divide-y divide-slate-200">
        {canCreateOrders && <QuickLink to="/sales/orders/new" label="Nueva orden de venta" icon={Plus} />}
        {canSeePurchases && <QuickLink to="/purchases/orders" label="Órdenes de compra" icon={ShoppingCart} />}
        {canSeeReceptions && <QuickLink to="/purchases/receptions" label="Registrar recepción" icon={Package} />}
        {canSeeStock && <QuickLink to="/inventory/stock" label="Consultar inventario" icon={Boxes} />}
        {(canSeeReceivables || canSeePayables) && <QuickLink to={canSeeReceivables ? "/finance/receivables" : "/finance/payables"} label="Resumen financiero" icon={WalletCards} />}
      </div></section>
    </section>
  </div>
}

function QuickLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Plus }) {
  return <Link to={to} className="flex items-center gap-3 py-2.5 text-xs text-slate-700 transition-colors hover:text-blue-600"><span className="flex size-7 items-center justify-center rounded-md bg-blue-50 text-blue-600"><Icon className="size-4" /></span><span className="flex-1">{label}</span><ArrowRight className="size-3.5 text-slate-400" /></Link>
}
