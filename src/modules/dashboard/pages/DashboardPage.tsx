import { useState, type ReactNode } from "react"
import { ArrowRight, CheckCircle2, PackageCheck, Truck, WalletCards } from "lucide-react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { GroupedBarChart, HorizontalBarChart, type SeriesDef } from "@/modules/reports/components/charts"
import { useMonthlyReport, useTopProducts } from "@/modules/reports/hooks"
import { monthLabel } from "@/modules/reports/schema"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { PeriodSelect } from "@/shared/components/PeriodSelect"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Skeleton } from "@/shared/components/ui/skeleton"

import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate, todayInLima } from "@/shared/lib/dates"
import { formatMoney, toCents } from "@/shared/lib/money"
import { periodRange, type PeriodPreset } from "@/shared/lib/periods"
import { useDashboard } from "../hooks"
import { getDeliveryStatusLabel } from "@/modules/sales/orders/schema"
import { PURCHASE_ORDER_STATUS_LABELS } from "@/modules/purchases/orders/schema"

const MONTHLY_SERIES: SeriesDef[] = [
  { key: "sales", label: "Ventas", fillClass: "fill-chart-1", swatchClass: "bg-chart-1" },
  { key: "purchases", label: "Compras", fillClass: "fill-chart-4", swatchClass: "bg-chart-4" },
]

/** Indicador: cifra grande y su explicaciÃ³n; el color nunca es lo Ãºnico que informa */
function StatTile({
  label,
  value,
  hint,
  children,
  featured = false,
}: {
  label: string
  value: string
  hint: string
  children?: ReactNode
  featured?: boolean
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border bg-card p-4 ${featured ? "border-primary/30 bg-primary/[0.03]" : ""}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`font-mono font-semibold tracking-tight ${featured ? "text-3xl" : "text-2xl"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  )
}

function AlertPanel({
  title,
  count,
  href,
  linkLabel,
  children,
  emptyMessage,
}: {
  title: string
  count: number
  href: string
  linkLabel: string
  children: ReactNode
  emptyMessage: string
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <StatusBadge tone={count > 0 ? "warning" : "success"} label={String(count)} />
        </div>
        <Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" to={href}>
          {linkLabel} <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      {count === 0 ? <p className="text-sm text-muted-foreground">{emptyMessage}</p> : children}
    </section>
  )
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<PeriodPreset>("quarter")
  const period = periodRange(preset, todayInLima())
  const dashboard = useDashboard(period)
  const canSeeStock = useHasPermission("inventory.stock:view")
  const canSeeReceivables = useHasPermission("finance.receivables:view")
  const canSeePayables = useHasPermission("finance.payables:view")
  const canSeeOrders = useHasPermission("sales.orders:view")
  const canSeePurchaseOrders = useHasPermission("purchases.orders:view")
  const canSeeReceptions = useHasPermission("purchases.receptions:view")
  const canSeeAnalytics = useHasPermission("reports.analytics:view")
  const monthly = useMonthlyReport(period, canSeeAnalytics)
  const topProducts = useTopProducts(period)
  const hasVisibleAlertPanel =
    canSeeReceivables || canSeeStock || canSeeOrders || canSeePurchaseOrders || canSeeReceptions

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen del negocio, alertas y tareas pendientes en un solo lugar."
        actions={<PeriodSelect value={preset} onChange={setPreset} />}
      />

      {dashboard.isError ? (
        <ErrorState message={getErrorMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
      ) : dashboard.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-busy="true">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        (() => {
          const data = dashboard.data
          const visibleAlertCount =
            (canSeeReceivables ? data.alerts.overdue_receivables.length : 0) +
            (canSeeStock ? data.alerts.low_stock.length : 0) +
            (canSeeOrders ? data.alerts.orders_to_invoice.length + data.alerts.pending_deliveries.length : 0) +
            (canSeePurchaseOrders || canSeeReceptions ? data.alerts.purchase_orders_to_receive.length : 0)
          return (
            <div className="space-y-8">
              <section aria-labelledby="financial-summary-title" className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 id="financial-summary-title" className="text-lg font-semibold">Resultados del periodo</h2>
                    <p className="text-sm text-muted-foreground">
                      Del {formatBusinessDate(data.date_from)} al {formatBusinessDate(data.date_to)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">La utilidad es bruta estimada; no descuenta gastos operativos.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <StatTile label="Ventas netas" value={formatMoney(data.sales)} hint="Emitidas menos anulaciones y devoluciones" featured />
                  <StatTile label="Costo de lo vendido" value={formatMoney(data.cost_of_sales)} hint="Estimado con el costo actual de los productos" />
                  <StatTile
                    label="Utilidad bruta estimada"
                    value={formatMoney(data.gross_profit)}
                    hint="Ventas sin IGV menos costo de lo vendido"
                    featured
                  />
                  <StatTile
                    label="Margen bruto estimado"
                    value={data.gross_margin === "" ? "â€”" : `${data.gross_margin} %`}
                    hint="Utilidad bruta sobre ventas sin IGV"
                  />
                  <StatTile label="Compras" value={formatMoney(data.purchases)} hint="Facturas de proveedor no anuladas" />
                </div>
              </section>

              {canSeeAnalytics && (
                <section aria-labelledby="analytics-title" className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="analytics-title" className="text-lg font-semibold">Análisis del negocio</h2><p className="text-sm text-muted-foreground">Tendencia comercial, productos líderes y posición financiera.</p></div><Link className="text-sm font-medium text-primary hover:underline" to="/reports/analytical">Ver reportes analíticos</Link></div>
                  <div className="grid items-stretch gap-4 lg:grid-cols-3">
                    <section className="min-w-0 rounded-xl border bg-card p-4 shadow-sm" aria-label="Tendencia mensual"><h3 className="mb-2 font-semibold">Tendencia mensual</h3>{monthly.isError ? <ErrorState message={getErrorMessage(monthly.error)} onRetry={() => void monthly.refetch()} /> : monthly.isPending ? <Skeleton className="h-64 w-full" /> : <GroupedBarChart title="Ventas y compras por mes" series={MONTHLY_SERIES} groups={monthly.data.map((point) => ({ key: point.month, label: monthLabel(point.month), values: { sales: toCents(point.sales), purchases: toCents(point.purchases) } }))} />}</section>
                    <section className="min-w-0 rounded-xl border bg-card p-4 shadow-sm" aria-label="Productos líderes"><h3 className="mb-2 font-semibold">Productos líderes</h3>{topProducts.isError ? <ErrorState message={getErrorMessage(topProducts.error)} onRetry={() => void topProducts.refetch()} /> : topProducts.isPending ? <Skeleton className="h-64 w-full" /> : <HorizontalBarChart title="Ventas netas por producto" fillClass="fill-chart-2" bars={topProducts.data.slice(0, 5).map((item) => ({ key: item.product_id, label: item.product_name, cents: toCents(item.amount), detail: `${item.quantity} unidades` }))} />}</section>
                    <section className="min-w-0 rounded-xl border bg-card p-4 shadow-sm" aria-label="Saldos financieros"><h3 className="mb-2 font-semibold">Posición de caja</h3><HorizontalBarChart title="Saldos pendientes" fillClass="fill-chart-3" bars={[{ key: "receivables", label: "Por cobrar", cents: toCents(data.receivables.total), detail: `${formatMoney(data.receivables.overdue)} vencido` }, { key: "payables", label: "Por pagar", cents: toCents(data.payables.total), detail: `${formatMoney(data.payables.due_soon)} vence en 7 días` }]} /></section>
                  </div>
                </section>
              )}
              <section aria-labelledby="alerts-title" className="space-y-3">
                <div>
                  <h2 id="alerts-title" className="text-lg font-semibold">Alertas y pendientes</h2>
                  <p className="text-sm text-muted-foreground">Primero lo urgente; abre cada lista para resolverlo.</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {canSeeReceivables && (
                    <AlertPanel
                      title="Cobros vencidos"
                      count={data.alerts.overdue_receivables.length}
                      href="/finance/receivables"
                      linkLabel="Ver cuentas"
                      emptyMessage="No hay cuentas por cobrar vencidas."
                    >
                      <ul className="divide-y">
                        {data.alerts.overdue_receivables.slice(0, 5).map((item) => (
                          <li key={item.invoice_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <span>{item.customer_name} Â· <span className="font-mono">{item.invoice_code}</span></span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono">{formatMoney(item.balance)}</span>
                              <StatusBadge tone="danger" label={`VenciÃ³ ${formatBusinessDate(item.due_date)}`} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </AlertPanel>
                  )}
                  {canSeeStock && (
                    <AlertPanel
                      title="Stock bajo mínimo"
                      count={data.alerts.low_stock.length}
                      href="/inventory/stock"
                      linkLabel="Ver inventario"
                      emptyMessage="Ningún producto está bajo su mí­nimo."
                    >
                      <ul className="divide-y">
                        {data.alerts.low_stock.slice(0, 5).map((item) => (
                          <li key={item.product_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <span>{item.product_name}</span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono">{item.stock} / mÃ­n. {item.min_stock} {item.unit}</span>
                              <StatusBadge tone={item.stock === 0 ? "danger" : "warning"} label={item.stock === 0 ? "Sin stock" : "Bajo"} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </AlertPanel>
                  )}
                  {canSeeOrders && (
                    <AlertPanel
                      title="Pedidos por facturar"
                      count={data.alerts.orders_to_invoice.length}
                      href="/sales/orders"
                      linkLabel="Ver pedidos"
                      emptyMessage="No hay pedidos confirmados pendientes de comprobante."
                    >
                      <ul className="divide-y">
                        {data.alerts.orders_to_invoice.slice(0, 5).map((item) => (
                          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <span>{item.customer_name} Â· <span className="font-mono">{item.number}</span></span>
                            <span className="font-mono">{formatMoney(item.total)}</span>
                          </li>
                        ))}
                      </ul>
                    </AlertPanel>
                  )}
                  {canSeeOrders && (
                    <AlertPanel
                      title="Entregas por completar"
                      count={data.alerts.pending_deliveries.length}
                      href="/sales/orders"
                      linkLabel="Ver pedidos"
                      emptyMessage="No hay envíos ni recojos pendientes."
                    >
                      <ul className="divide-y">
                        {data.alerts.pending_deliveries.slice(0, 5).map((item) => (
                          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <span>{item.customer_name} Â· <span className="font-mono">{item.number}</span></span>
                            <StatusBadge tone="warning" label={getDeliveryStatusLabel(item.method, item.status)} />
                          </li>
                        ))}
                      </ul>
                    </AlertPanel>
                  )}
                  {(canSeePurchaseOrders || canSeeReceptions) && (
                    <AlertPanel
                      title="Órdenes por recibir"
                      count={data.alerts.purchase_orders_to_receive.length}
                      href={canSeeReceptions ? "/purchases/receptions" : "/purchases/orders"}
                      linkLabel={canSeeReceptions ? "Ver recepciones" : "Ver órdenes"}
                      emptyMessage="No hay órdenes emitidas con productos pendientes de recepción."
                    >
                      <ul className="divide-y">
                        {data.alerts.purchase_orders_to_receive.slice(0, 5).map((item) => (
                          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <span>{item.supplier_name} <span className="font-mono">{item.number}</span></span>
                            <span className="flex items-center gap-2">
                              <StatusBadge tone="neutral" label={PURCHASE_ORDER_STATUS_LABELS[item.status]} />
                              <span className="text-muted-foreground">{formatBusinessDate(item.expected_date)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </AlertPanel>
                  )}
                  {hasVisibleAlertPanel && visibleAlertCount === 0 && (
                      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
                        <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
                        Todo al día. No hay alertas ni pendientes operativos.
                      </div>
                    )}
                </div>
              </section>

              <section aria-labelledby="position-title" className="space-y-3">
                <div>
                  <h2 id="position-title" className="text-lg font-semibold">Finanzas e inventario</h2>
                  <p className="text-sm text-muted-foreground">Saldos pendientes y productos que necesitan atención.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {canSeeStock && (
                    <StatTile
                      label="Stock crí­tico"
                      value={String(data.critical_stock_count)}
                      hint={data.critical_stock_count === 1 ? "producto en o bajo su mí­nimo" : "productos en o bajo su mí­nimo"}
                    />
                  )}
                  <StatTile label="Rotación de inventario" value={data.inventory_turnover} hint="Indicador aproximado del periodo" />
                  {canSeePayables && toCents(data.payables.due_soon) > 0 && (
                    <Link to="/finance/payables" className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm transition-colors hover:bg-warning/10">
                      <WalletCards aria-hidden="true" className="size-5 text-warning" />
                      <span>Revisar pagos que vencen en los próximos 7 días</span>
                      <ArrowRight aria-hidden="true" className="ml-auto size-4" />
                    </Link>
                  )}
                  {canSeeReceptions && data.alerts.purchase_orders_to_receive.length > 0 && (
                    <Link to="/purchases/receptions" className="flex items-center gap-3 rounded-xl border p-4 text-sm transition-colors hover:bg-muted/50">
                      <PackageCheck aria-hidden="true" className="size-5 text-primary" />
                      <span>{data.alerts.purchase_orders_to_receive.length} Ordenes esperan recepción</span>
                      <ArrowRight aria-hidden="true" className="ml-auto size-4" />
                    </Link>
                  )}
                  {canSeeOrders && data.alerts.pending_deliveries.length > 0 && (
                    <Link to="/sales/orders" className="flex items-center gap-3 rounded-xl border p-4 text-sm transition-colors hover:bg-muted/50">
                      <Truck aria-hidden="true" className="size-5 text-primary" />
                      <span>{data.alerts.pending_deliveries.length} entregas por completar</span>
                      <ArrowRight aria-hidden="true" className="ml-auto size-4" />
                    </Link>
                  )}
                </div>
              </section>
            </div>
          )
        })()
      )}
    </>
  )
}
