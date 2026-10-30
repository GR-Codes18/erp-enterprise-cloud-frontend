import { AdminFormDialog, type FormFieldConfig } from "../../shared/AdminFormDialog"
import { useCreateSeries, useUpdateSeries } from "../hooks"
import type { DocumentSeries } from "../mock"
import {
  DOCUMENT_TYPES,
  EMPTY_SERIES,
  VIGENCIA_OPTIONS,
  seriesFormSchema,
  seriesToForm,
  seriesToInput,
  type SeriesFormValues,
} from "../schema"

const FIELDS: FormFieldConfig<SeriesFormValues>[] = [
  {
    name: "tipo_documento",
    label: "Tipo de documento",
    type: "select",
    options: DOCUMENT_TYPES.map((value) => ({ value, label: value })),
    lockedOnEdit: true,
  },
  { name: "serie", label: "Serie", placeholder: "Ej. F001", mono: true, lockedOnEdit: true },
  { name: "sucursal_id", label: "Sucursal", placeholder: "Ej. SUC-01", lockedOnEdit: true },
  {
    name: "correlativo",
    label: "Correlativo actual",
    mono: true,
    hint: "Último número emitido. No puede bajar una vez que la serie emitió comprobantes.",
  },
  { name: "vigencia", label: "Vigencia", type: "select", options: VIGENCIA_OPTIONS },
]

interface SeriesFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; una serie = editar */
  series: DocumentSeries | null
}

export function SeriesFormDialog({ open, onOpenChange, series }: SeriesFormDialogProps) {
  const create = useCreateSeries()
  const update = useUpdateSeries()
  const isEdit = series !== null

  return (
    <AdminFormDialog<SeriesFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar serie" : "Nueva serie"}
      description={
        isEdit
          ? "Puedes cambiar el correlativo y la vigencia. El tipo, la serie y la sucursal no se modifican."
          : "Registra una serie de comprobantes para una sucursal."
      }
      isEdit={isEdit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear serie"}
      schema={seriesFormSchema}
      defaultValues={series ? seriesToForm(series) : EMPTY_SERIES}
      fields={FIELDS}
      onSubmit={(values) =>
        series
          ? update.mutateAsync({ id: series.id, input: seriesToInput(values) })
          : create.mutateAsync(seriesToInput(values))
      }
    />
  )
}
