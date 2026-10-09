import { Field } from "@/shared/components/Field"
import { Input } from "@/shared/components/ui/input"
import { isValidDateRange } from "@/shared/lib/filters"

interface DateRangeFilterProps {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  /** Prefijo de los id, por si hay dos rangos en la misma pantalla */
  idPrefix?: string
  fromLabel?: string
  toLabel?: string
}

/** Rango de fechas AAAA-MM-DD para filtros de listados. Un rango invertido se avisa junto al campo. */
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  idPrefix = "date",
  fromLabel = "Desde",
  toLabel = "Hasta",
}: DateRangeFilterProps) {
  const valid = isValidDateRange(from, to)
  const fromId = `${idPrefix}_from`
  const toId = `${idPrefix}_to`

  return (
    <>
      <Field id={fromId} label={fromLabel}>
        <Input
          id={fromId}
          type="date"
          className="w-40"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
        />
      </Field>
      <Field
        id={toId}
        label={toLabel}
        error={valid ? undefined : "La fecha final no puede ser anterior a la inicial"}
      >
        <Input
          id={toId}
          type="date"
          className="w-40"
          aria-invalid={!valid}
          aria-describedby={valid ? undefined : `${toId}-error`}
          value={to}
          onChange={(event) => onToChange(event.target.value)}
        />
      </Field>
    </>
  )
}
