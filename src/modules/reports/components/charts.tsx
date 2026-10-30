import { useState } from "react"
import { formatCents, formatCompactCents } from "@/shared/lib/money"
import { niceTicks } from "../schema"

/**
 * Gráficos en SVG propio (sin librería: no se instala nada sin aprobarlo). Colores solo de
 * tokens de index.css: chart-1 y chart-4, par validado con el validador de paletas
 * (CVD ΔE 37, visión normal ΔE 43.8). El ámbar tiene contraste 2.15:1 con el fondo, por eso
 * cada gráfico lleva valores visibles al pasar el cursor y una vista de tabla.
 */

export interface SeriesDef {
  key: string
  label: string
  /** Clases literales para que Tailwind las detecte: "fill-chart-1" y "bg-chart-1" */
  fillClass: string
  swatchClass: string
}

/** Barras redondeadas solo en el extremo de datos (4px); la base queda recta sobre el eje */
function barPath(x: number, y: number, width: number, height: number, radius = 4) {
  const r = Math.min(radius, width / 2, height)
  if (height <= 0) return ""
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
}

/** Etiquetas de eje y valores directos: abreviados (el valor exacto está en el tooltip y la tabla) */
const compactMoney = formatCompactCents

export function Legend({ series }: { series: SeriesDef[] }) {
  return (
    <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground" aria-label="Leyenda">
      {series.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <span aria-hidden="true" className={`inline-block size-3 rounded-sm ${item.swatchClass}`} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

interface GroupedBarChartProps {
  title: string
  /** Una categoría por grupo (ej. un mes) con el valor en centavos de cada serie */
  groups: { key: string; label: string; values: Record<string, number> }[]
  series: SeriesDef[]
}

/** Barras agrupadas (ej. ventas y compras por mes): un solo eje, en soles, desde cero */
export function GroupedBarChart({ title, groups, series }: GroupedBarChartProps) {
  const [hover, setHover] = useState<{ group: number; series: number } | null>(null)
  const width = 640
  const height = 260
  const margin = { top: 16, right: 12, bottom: 32, left: 72 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const max = Math.max(0, ...groups.flatMap((group) => series.map((item) => group.values[item.key] ?? 0)))
  const ticks = niceTicks(max)
  const top = ticks.at(-1) || 1
  const groupWidth = plotWidth / Math.max(1, groups.length)
  const barWidth = Math.min(28, (groupWidth * 0.7 - 2 * (series.length - 1)) / series.length)
  const y = (value: number) => margin.top + plotHeight - (value / top) * plotHeight

  const active = hover ? { group: groups[hover.group], item: series[hover.series] } : null

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        <Legend series={series} />
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={title}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} />
              <text x={margin.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                {compactMoney(tick)}
              </text>
            </g>
          ))}
          {groups.map((group, groupIndex) => {
            const start = margin.left + groupIndex * groupWidth + (groupWidth - (barWidth * series.length + 2 * (series.length - 1))) / 2
            return (
              <g key={group.key}>
                {series.map((item, seriesIndex) => {
                  const value = group.values[item.key] ?? 0
                  const x = start + seriesIndex * (barWidth + 2)
                  const isActive = hover?.group === groupIndex && hover.series === seriesIndex
                  return (
                    <g key={item.key}>
                      <path d={barPath(x, y(value), barWidth, margin.top + plotHeight - y(value))} className={item.fillClass} opacity={hover && !isActive ? 0.45 : 1} />
                      {/* Zona de foco y cursor más grande que la barra */}
                      <rect
                        x={x - 1}
                        y={margin.top}
                        width={barWidth + 2}
                        height={plotHeight}
                        fill="transparent"
                        tabIndex={0}
                        role="img"
                        aria-label={`${group.label}, ${item.label}: ${formatCents(value)}`}
                        onMouseEnter={() => setHover({ group: groupIndex, series: seriesIndex })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ group: groupIndex, series: seriesIndex })}
                        onBlur={() => setHover(null)}
                      />
                    </g>
                  )
                })}
                <text x={margin.left + groupIndex * groupWidth + groupWidth / 2} y={height - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                  {group.label}
                </text>
              </g>
            )
          })}
          <line x1={margin.left} x2={width - margin.right} y1={y(0)} y2={y(0)} className="stroke-muted-foreground" strokeWidth={1} />
        </svg>
        {active && (
          <div role="status" className="pointer-events-none absolute right-2 top-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
            <p className="text-muted-foreground">{active.group.label}</p>
            <p className="flex items-center gap-2">
              <span aria-hidden="true" className={`inline-block size-2.5 rounded-sm ${active.item.swatchClass}`} />
              {active.item.label}: <span className="font-mono font-medium">{formatCents(active.group.values[active.item.key] ?? 0)}</span>
            </p>
          </div>
        )}
      </div>
    </figure>
  )
}

interface HorizontalBarChartProps {
  title: string
  bars: { key: string; label: string; cents: number; detail: string }[]
  fillClass: string
}

/** Ranking en barras horizontales de una sola serie: el título la nombra, sin leyenda */
export function HorizontalBarChart({ title, bars, fillClass }: HorizontalBarChartProps) {
  const max = Math.max(1, ...bars.map((bar) => bar.cents))
  const rowHeight = 36
  const labelWidth = 220
  const valueWidth = 96
  const width = 640
  const barArea = width - labelWidth - valueWidth
  const height = bars.length * rowHeight + 8

  return (
    <figure className="space-y-3">
      <figcaption className="font-medium">{title}</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={title}>
        {bars.map((bar, index) => {
          const y = index * rowHeight + 4
          const barWidth = (bar.cents / max) * barArea
          return (
            <g key={bar.key}>
              <title>{`${bar.label}: ${formatCents(bar.cents)} (${bar.detail})`}</title>
              <text x={labelWidth - 8} y={y + rowHeight / 2 - 4} dy="0.32em" textAnchor="end" className="fill-foreground text-[12px]">
                {bar.label.length > 30 ? `${bar.label.slice(0, 29)}…` : bar.label}
              </text>
              {/* Barra horizontal: el extremo de datos (derecha) va redondeado */}
              <path
                d={
                  barWidth > 0
                    ? `M${labelWidth},${y + 6} H${labelWidth + barWidth - 4} Q${labelWidth + barWidth},${y + 6} ${labelWidth + barWidth},${y + 10} V${y + rowHeight - 14} Q${labelWidth + barWidth},${y + rowHeight - 10} ${labelWidth + barWidth - 4},${y + rowHeight - 10} H${labelWidth} Z`
                    : ""
                }
                className={fillClass}
              />
              {/* Valor directo al final de la barra, en tinta de texto (no del color de la serie) */}
              <text x={labelWidth + barWidth + 6} y={y + rowHeight / 2 - 4} dy="0.32em" className="fill-muted-foreground font-mono text-[11px]">
                {compactMoney(bar.cents)}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
