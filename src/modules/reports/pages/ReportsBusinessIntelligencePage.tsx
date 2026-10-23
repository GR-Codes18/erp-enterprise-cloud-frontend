import { useState } from "react"
import {
  ArrowRight,
  BarChart3,
  BadgePercent,
  Boxes,
  CalendarRange,
  FileText,
  Landmark,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Truck,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router"
import { useDashboard } from "@/modules/dashboard/hooks"
import { PageHeader } from "@/shared/components/PageHeader"
import { PeriodSelect } from "@/shared/components/PeriodSelect"
import { ErrorState } from "@/shared/components/ErrorState"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate, todayInLima } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { periodRange, type PeriodPreset } from "@/shared/lib/periods"

type ReportCard = {
  title: string
  description: string
  href?: string
  available?: boolean
  icon: LucideIcon
  tone: "blue" | "green" | "amber" | "slate"
}

const REPORT_CARDS: ReportCard[] = [
  { title: "Dashboard ejecutivo", description: "Indicadores clave de la empresa", href: "/dashboard", icon: BarChart3, tone: "blue" },
  { title: "Reporte de ventas", description: "Ventas, clientes, productos y vendedores", href: "/reports/operational", icon: TrendingUp, tone: "green" },
  { title: "Reporte de compras", description: "Abastecimiento y proveedores", href: "/reports/operational", icon: ShoppingCart, tone: "amber" },
  { title: "Reporte de inventario y Kardex", description: "Movimientos, saldos y valorización", href: "/inventory/kardex", icon: Boxes, tone: "blue" },
  { title: "Cuentas por cobrar y pagar", description: "Saldos, vencimientos y obligaciones", href: "/finance/receivables", icon: Landmark, tone: "slate" },
  { title: "Reporte de logística", description: "Entregas, rutas e incidencias", available: false, icon: Truck, tone: "amber" },
  { title: "Reporte de comisiones y metas", description: "Avance comercial y cumplimiento de objetivos", href: "/goals", icon: BadgePercent, tone: "green" },
  { title: "Reportes de importación, contratos y proveedores", description: "Funcionalidad futura y opcional", available: false, icon: FileText, tone: "slate" },
]

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: "blue" | "green" | "amber" | "slate"
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  )
}

export default function ReportsBusinessIntelligencePage() {
  const [preset, setPreset] = useState<PeriodPreset>("quarter")
  const period = periodRange(preset, todayInLima())
  const dashboard = useDashboard(period)

  const executiveMetrics = [
    {
      label: "Ventas del período",
      value: dashboard.data ? formatMoney(dashboard.data.sales) : "—",
      detail: dashboard.data ? `Período ${formatBusinessDate(dashboard.data.date_from)} – ${formatBusinessDate(dashboard.data.date_to)}` : "Sin datos del periodo",
      icon: TrendingUp,
      tone: "blue" as const,
    },
    {
      label: "Compras del período",
      value: dashboard.data ? formatMoney(dashboard.data.purchases) : "—",
      detail: dashboard.data ? "Compras registradas sin anulaciones" : "Sin datos del periodo",
      icon: ShoppingCart,
      tone: "green" as const,
    },
    {
      label: "Margen comercial",
      value: dashboard.data && dashboard.data.gross_margin ? `${dashboard.data.gross_margin}%` : "No disponible",
      detail: dashboard.data && dashboard.data.gross_margin ? "Utilidad bruta sobre ventas netas" : "La API actual no entrega este indicador consolidado",
      icon: BadgePercent,
      tone: "amber" as const,
    },
    {
      label: "Inventario valorizado",
      value: "No disponible",
      detail: "No hay valorización consolidada en la fuente actual disponible",
      icon: Boxes,
      tone: "slate" as const,
    },
    {
      label: "Cuentas por cobrar",
      value: dashboard.data ? formatMoney(dashboard.data.receivables.total) : "—",
      detail: dashboard.data ? `Vencidas: ${formatMoney(dashboard.data.receivables.overdue)}` : "Sin datos del periodo",
      icon: WalletCards,
      tone: "blue" as const,
    },
    {
      label: "Cuentas por pagar",
      value: dashboard.data ? formatMoney(dashboard.data.payables.total) : "—",
      detail: dashboard.data ? `Por vencer en 7 días: ${formatMoney(dashboard.data.payables.due_soon)}` : "Sin datos del periodo",
      icon: Landmark,
      tone: "slate" as const,
    },
    {
      label: "Flujo de caja",
      value: "No disponible",
      detail: "La fuente actual no expone este indicador consolidado",
      icon: CalendarRange,
      tone: "amber" as const,
    },
  ]

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title="Reportes e Inteligencia de Negocios"
        description="Consulta indicadores empresariales, analiza resultados operativos y financieros, y accede a información confiable para la toma de decisiones."
        actions={
          <Button variant="outline" onClick={() => void dashboard.refetch()} disabled={dashboard.isPending}>
            <RefreshCw aria-hidden="true" className={dashboard.isPending ? "animate-spin" : ""} />
            Actualizar
          </Button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Dashboard ejecutivo</h2>
            <p className="text-sm text-slate-500">Indicadores principales del negocio y su evolución por período.</p>
          </div>
          <PeriodSelect value={preset} onChange={setPreset} />
        </div>

        {dashboard.isError ? (
          <ErrorState message={getErrorMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {dashboard.isPending
              ? Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
                ))
              : executiveMetrics.map((metric) => (
                  <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    detail={metric.detail}
                    icon={metric.icon}
                    tone={metric.tone}
                  />
                ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reportes disponibles</h2>
            <p className="text-sm text-slate-500">Accede a los reportes del ERP y a los indicadores del negocio.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {REPORT_CARDS.map((card) => {
            const content = (
              <article
                className={`group flex h-full flex-col rounded-xl border p-4 shadow-sm transition-colors ${
                  card.available === false
                    ? "border-dashed border-slate-200 bg-slate-50 text-slate-500"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${card.available === false ? "bg-slate-200 text-slate-500" : "bg-blue-50 text-blue-600"}`}>
                    <card.icon aria-hidden="true" className="size-4" />
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      card.available === false ? "bg-slate-200 text-slate-600" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {card.available === false ? "Futuro" : "Disponible"}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{card.description}</p>

                <div className="mt-auto flex items-center justify-between pt-4 text-sm font-medium">
                  <span>{card.available === false ? "No disponible actualmente" : "Abrir reporte"}</span>
                  {card.available === false ? null : <ArrowRight aria-hidden="true" className="size-4 text-blue-600" />}
                </div>
              </article>
            )

            if (card.available === false) {
              return <div key={card.title}>{content}</div>
            }

            return (
              <Link key={card.title} to={card.href ?? "/reports"} className="block h-full">
                {content}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
