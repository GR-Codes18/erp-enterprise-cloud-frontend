import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { FILTER_ALL } from "@/shared/lib/filters"

export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  /** Nombre accesible del filtro, ej. "Filtrar por almacén" */
  label: string
  value: string
  onChange: (value: string) => void
  /** Texto de la opción "todos", ej. "Todos los almacenes" */
  allLabel: string
  options: FilterOption[]
  className?: string
}

/** Selector de filtro de listado con la opción "todos" (FILTER_ALL) al inicio */
export function FilterSelect({ label, value, onChange, allLabel, options, className }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-48"} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
