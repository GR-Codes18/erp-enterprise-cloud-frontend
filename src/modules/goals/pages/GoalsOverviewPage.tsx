import { ArrowRight, BadgeCheck, ClipboardList, Gauge, LineChart, ShieldAlert, Target, TrendingUp } from "lucide-react"
import { Link } from "react-router"
import { PageHeader } from "@/shared/components/PageHeader"
import { EmptyState } from "@/shared/components/EmptyState"
import { cn } from "@/shared/lib/utils"

const GOAL_SECTIONS = [
  {
    id: "definition",
    title: "Definición de metas",
    description: "Permite crear, consultar y administrar los objetivos comerciales.",
    fields: ["Código", "Nombre", "Período", "Tipo de indicador", "Unidad de medida", "Valor objetivo", "Responsable", "Alcance"],
    icon: Target,
    tone: "blue",
  },
  {
    id: "seller",
    title: "Metas por vendedor",
    description: "Permite asignar y supervisar objetivos individuales de cada vendedor.",
    fields: ["Meta asociada", "Vendedor", "Período", "Objetivo asignado", "Ponderación", "Estado"],
    icon: BadgeCheck,
    tone: "green",
  },
  {
    id: "team",
    title: "Metas por sucursal/equipo",
    description: "Permite establecer objetivos colectivos y supervisar el desempeño de sucursales o equipos.",
    fields: ["Meta asociada", "Sucursal o equipo", "Período", "Objetivo", "Responsable"],
    icon: ClipboardList,
    tone: "amber",
  },
  {
    id: "product",
    title: "Metas por producto/categoría",
    description: "Permite establecer objetivos relacionados con productos o categorías comerciales.",
    fields: ["Meta asociada", "Producto o categoría", "Unidades objetivo", "Importe objetivo", "Margen objetivo"],
    icon: Gauge,
    tone: "violet",
  },
  {
    id: "progress",
    title: "Avance de metas",
    description: "Permite comparar los resultados reales con los objetivos establecidos.",
    fields: ["Meta asociada", "Valor real alcanzado", "Porcentaje de cumplimiento", "Fecha de corte", "Fuente de datos"],
    icon: TrendingUp,
    tone: "emerald",
  },
  {
    id: "ranking",
    title: "Ranking comercial",
    description: "Permite comparar el rendimiento comercial de los vendedores según criterios definidos.",
    fields: ["Período", "Vendedor", "Indicador evaluado", "Valor real", "Posición", "Criterio de clasificación"],
    icon: LineChart,
    tone: "slate",
  },
  {
    id: "alerts",
    title: "Alertas de cumplimiento",
    description: "Permite identificar desviaciones y objetivos que requieren atención.",
    fields: ["Meta asociada", "Umbral", "Fecha", "Responsable", "Mensaje", "Estado"],
    icon: ShieldAlert,
    tone: "red",
  },
] as const

const SUMMARY_METRICS = [
  { label: "Metas activas", value: 0, caption: "Sin registros" },
  { label: "Metas cumplidas", value: 0, caption: "Sin registros" },
  { label: "Metas en progreso", value: 0, caption: "Sin registros" },
  { label: "Metas con riesgo", value: 0, caption: "Sin registros" },
]

export default function GoalsOverviewPage() {
  const hasRecords = false

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Metas y Objetivos"
        description="Define objetivos comerciales, supervisa su cumplimiento y analiza el rendimiento por vendedor, sucursal, equipo y producto"
      />

      <section aria-label="Resumen visual de metas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_METRICS.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
            <p className="mt-2 text-xs text-slate-500">{metric.caption}</p>
          </article>
        ))}
      </section>

      {!hasRecords && (
        <EmptyState
          title="Sin metas registradas"
          description="Todavía no hay objetivos creados o asociados a la operación. Cuando existan registros confirmados, se mostrarán aquí los indicadores del módulo."
        />
      )}

      <section aria-label="Submódulos de Metas y Objetivos" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GOAL_SECTIONS.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.id}
              to={`/goals/${card.id}`}
              className={cn(
                "group flex h-full flex-col rounded-xl border border-slate-200 bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg border",
                    card.tone === "blue" && "border-blue-200 bg-blue-50 text-blue-600",
                    card.tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-600",
                    card.tone === "amber" && "border-amber-200 bg-amber-50 text-amber-600",
                    card.tone === "violet" && "border-violet-200 bg-violet-50 text-violet-600",
                    card.tone === "emerald" && "border-emerald-200 bg-emerald-50 text-emerald-600",
                    card.tone === "slate" && "border-slate-200 bg-slate-100 text-slate-700",
                    card.tone === "red" && "border-red-200 bg-red-50 text-red-600",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <ArrowRight
                  className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-5 flex-1">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-slate-200 pt-4 text-xs text-slate-500">
                {card.fields.map((field) => (
                  <li key={field} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-slate-300" aria-hidden="true" />
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

export function GoalsSectionPage({ sectionId }: { sectionId: string }) {
  const section = GOAL_SECTIONS.find((item) => item.id === sectionId)

  if (!section) {
    return (
      <div className="space-y-4">
        <PageHeader title="Metas y Objetivos" description="Sección no disponible." />
        <EmptyState title="Submódulo no encontrado" description="La sección solicitada no existe o no está disponible en el sistema actual." />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={section.title}
        description={section.description}
        actions={
          <Link to="/goals" className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
            Volver
          </Link>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
            <section.icon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resumen</p>
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {section.fields.map((field) => (
            <div key={field} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{field}</p>
              <p className="mt-2 text-sm text-slate-700">No disponible</p>
            </div>
          ))}
        </div>
      </section>

      <EmptyState
        title="Sin datos para esta vista"
        description="Aún no existen registros operativos para este submódulo. Cuando se habilite la información real del ERP, se mostrará aquí el contenido funcional asociado."
      />
    </div>
  )
}
