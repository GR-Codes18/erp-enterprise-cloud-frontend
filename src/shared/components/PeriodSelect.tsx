import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { PERIOD_LABELS, PERIOD_PRESETS, type PeriodPreset } from "@/shared/lib/periods"

interface PeriodSelectProps {
  value: PeriodPreset
  onChange: (value: PeriodPreset) => void
}

/** Periodo rápido para indicadores y reportes: este mes, últimos 90 días o este año */
export function PeriodSelect({ value, onChange }: PeriodSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as PeriodPreset)}>
      <SelectTrigger className="w-48" aria-label="Periodo">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_PRESETS.map((preset) => (
          <SelectItem key={preset} value={preset}>
            {PERIOD_LABELS[preset]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
