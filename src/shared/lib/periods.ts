import { addDays } from "@/shared/lib/dates"

export const PERIOD_PRESETS = ["month", "quarter", "year"] as const
export type PeriodPreset = (typeof PERIOD_PRESETS)[number]

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  month: "Este mes",
  quarter: "Últimos 90 días",
  year: "Este año",
}

export interface Period {
  date_from: string
  date_to: string
}

/** Rango de fechas de negocio de un periodo rápido, terminando hoy (fechas de Lima) */
export function periodRange(preset: PeriodPreset, today: string): Period {
  switch (preset) {
    case "month":
      return { date_from: `${today.slice(0, 8)}01`, date_to: today }
    case "quarter":
      return { date_from: addDays(today, -89), date_to: today }
    case "year":
      return { date_from: `${today.slice(0, 4)}-01-01`, date_to: today }
  }
}
