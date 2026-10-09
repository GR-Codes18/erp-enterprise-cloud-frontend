import { IGV_PERCENT } from "@/shared/lib/tax"
import { formatCents, formatMoney } from "@/shared/lib/money"

type TotalsSummaryProps =
  | {
      /** Vista previa calculada en el frontend (centavos) */
      preview: { subtotalCents: number; igvCents: number; totalCents: number }
      official?: never
    }
  | {
      /** Totales oficiales devueltos por el backend (texto decimal) */
      official: { subtotal: string; igv: string; total: string }
      preview?: never
    }

/** Subtotal, IGV y total alineados a la derecha. La vista previa lo dice: manda el backend */
export function TotalsSummary({ preview, official }: TotalsSummaryProps) {
  const rows = preview
    ? [
        ["Subtotal", formatCents(preview.subtotalCents)],
        [`IGV (${IGV_PERCENT} %)`, formatCents(preview.igvCents)],
        ["Total", formatCents(preview.totalCents)],
      ]
    : [
        ["Subtotal", formatMoney(official.subtotal)],
        [`IGV (${IGV_PERCENT} %)`, formatMoney(official.igv)],
        ["Total", formatMoney(official.total)],
      ]

  return (
    <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
      <dl className="space-y-1">
        {rows.map(([label, value], index) => (
          <div
            key={label}
            className={`flex justify-between gap-4 ${index === rows.length - 1 ? "border-t pt-1 text-base font-semibold" : ""}`}
          >
            <dt className={index === rows.length - 1 ? "" : "text-muted-foreground"}>{label}</dt>
            <dd className="font-mono">{value}</dd>
          </div>
        ))}
      </dl>
      {preview && (
        <p className="text-xs text-muted-foreground">Vista previa: el total oficial lo calcula el sistema al guardar.</p>
      )}
    </div>
  )
}
