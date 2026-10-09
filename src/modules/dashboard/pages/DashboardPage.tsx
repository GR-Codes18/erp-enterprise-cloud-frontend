import { useState, type ReactNode } from "react"
import { AlertTriangle, Clock } from "lucide-react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
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

/** Indicador: cifra grande y su explicación; el color nunca es lo único que informa */
function StatTile({ label, value, hint, children }: { label: string; value: string; hint: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<PeriodPreset>("quarter")
  const period = periodRange(preset, todayInLima())
  const dashboard = useDashboard(period)
  const canSeeStock = useHasPermission("inventory.stock:view")
  const canSeeReceivables = useHasPermission("finance.receivables:view")

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Indicadores calculados por el sistema para el periodo elegido."
        actions={<PeriodSelect value={preset} onChange={setPreset} />}
      />

      {dashboard.isError ? (
        <ErrorState message={getErrorMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
      ) : dashboard.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        (() => {
          const data = dashboard.data
          return (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground">
                Del {formatBusinessDate(data.date_from)} al {formatBusinessDate(data.date_to)}
              </p>
              <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Ventas" value={formatMoney(data.sales)} hint="Comprobantes emitidos, sin anulados ni devoluciones" />
                <StatTile label="Compras" value={formatMoney(data.purchases)} hint="Facturas de proveedor registradas" />
                <StatTile
                  label="Utilidad bruta"
                  value={formatMoney(data.gross_profit)}
                  hint={data.gross_margin === "" ? "Sin ventas en el periodo" : `Margen ${data.gross_margin} % sobre ventas sin IGV`}
                />
                <StatTile label="Rotación de inventario" value={data.inventory_turnover} hint="Costo de ventas ÷ inventario promedio" />
                <StatTile label="Cuentas por cobrar" value={formatMoney(data.receivables.total)} hint="Saldo total pendiente">
                  {toCents(data.receivables.overdue) > 0 && (
                    <StatusBadge tone="danger" label={`Vencido ${formatMoney(data.receivables.overdue)}`} />
                  )}
                </StatTile>
                <StatTile label="Cuentas por pagar" value={formatMoney(data.payables.total)} hint="Saldo total pendiente">
                  {toCents(data.payables.due_soon) > 0 && (
                    <StatusBadge tone="warning" label={`Vence en 7 días ${formatMoney(data.payables.due_soon)}`} />
                  )}
                </StatTile>
                <StatTile
                  label="Stock crítico"
                  value={String(data.critical_stock_count)}
                  hint={data.critical_stock_count === 1 ? "producto en o bajo su mínimo" : "productos en o bajo su mínimo"}
                />
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section aria-labelledby="low-stock-title" className="space-y-3 rounded-md border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="low-stock-title" className="flex items-center gap-2 font-medium">
                      <AlertTriangle aria-hidden="true" className="size-4" />
                      Stock bajo mínimo
                    </h2>
                    {canSeeStock && (
                      <Link className="text-sm underline" to="/inventory/stock">
                        Ver stock
                      </Link>
                    )}
                  </div>
                  {data.alerts.low_stock.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ningún producto está bajo su mínimo.</p>
                  ) : (
                    <ul className="divide-y">
                      {data.alerts.low_stock.map((item) => (
                        <li key={item.product_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <span>{item.product_name}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono">
                              {item.stock} / mín. {item.min_stock} {item.unit}
                            </span>
                            <StatusBadge tone={item.stock === 0 ? "danger" : "warning"} label={item.stock === 0 ? "Sin stock" : "Bajo"} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="overdue-title" className="space-y-3 rounded-md border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="overdue-title" className="flex items-center gap-2 font-medium">
                      <Clock aria-hidden="true" className="size-4" />
                      Cuentas por cobrar vencidas
                    </h2>
                    {canSeeReceivables && (
                      <Link className="text-sm underline" to="/finance/receivables">
                        Ver cuentas por cobrar
                      </Link>
                    )}
                  </div>
                  {data.alerts.overdue_receivables.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay cuentas vencidas.</p>
                  ) : (
                    <ul className="divide-y">
                      {data.alerts.overdue_receivables.map((item) => (
                        <li key={item.invoice_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <span>
                            {item.customer_name} · <span className="font-mono">{item.invoice_code}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono">{formatMoney(item.balance)}</span>
                            <StatusBadge tone="danger" label={`Venció ${formatBusinessDate(item.due_date)}`} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )
        })()
      )}
    </>
  )
}
