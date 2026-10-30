import { createCrudHandlers } from "@/mocks/utils/crud"

/** UUID fijos con el prefijo de series (8013) */
const uuid = (n: number) => `00000000-0000-4000-8013-${String(n).padStart(12, "0")}`

export interface DocumentSeries {
  id: string;
  tipo_documento: string;
  serie: string;
  sucursal_id: string;
  correlativo: number;
  vigencia: boolean;
}

const seed: DocumentSeries[] = [
  {
    id: uuid(1),
    tipo_documento: "Factura Electrónica",
    serie: "F001",
    sucursal_id: "SUC-01",
    correlativo: 1250,
    vigencia: true,
  },
  {
    id: uuid(2),
    tipo_documento: "Boleta de Venta",
    serie: "B001",
    sucursal_id: "SUC-01",
    correlativo: 4890,
    vigencia: true,
  },
  {
    id: uuid(3),
    tipo_documento: "Nota de Crédito",
    serie: "FC01",
    sucursal_id: "SUC-02",
    correlativo: 45,
    vigencia: true,
  },
]

const fieldError = (status: number, code: string, field: string, message: string) => ({
  status,
  code,
  message,
  errors: [{ field, message }],
})

export const seriesHandlers = createCrudHandlers<DocumentSeries>({
  resource: "series",
  seed,
  searchFields: ["tipo_documento", "serie", "sucursal_id"],
  filterFields: ["tipo_documento", "sucursal_id", "vigencia"],
  insertAt: "start",
  prepareCreate: (body) => ({
    tipo_documento: String(body.tipo_documento ?? "").trim(),
    serie: String(body.serie ?? "").trim().toUpperCase(),
    sucursal_id: String(body.sucursal_id ?? "").trim(),
    correlativo: Number(body.correlativo) || 0,
    vigencia: body.vigencia !== false,
  }),
  prepareUpdate: (current, body) => ({
    correlativo: body.correlativo === undefined ? current.correlativo : Number(body.correlativo) || 0,
    vigencia: body.vigencia !== false,
  }),
  // El tipo, la serie y la sucursal identifican la serie: no cambian después de crearla
  immutableFields: ["tipo_documento", "serie", "sucursal_id"],
  // Una serie que ya emitió comprobantes no se borra: se desactiva
  isInUse: (item) => item.correlativo > 0,
  inUseMessage: "La serie ya emitió comprobantes y no se puede eliminar. Puedes desactivarla.",
  validate: ({ action, current, next, items }) => {
    if (action === "create" && next) {
      const exists = items.some(
        (item) =>
          item.serie.toLowerCase() === next.serie.toLowerCase() &&
          item.sucursal_id.toLowerCase() === next.sucursal_id.toLowerCase(),
      )
      if (exists) return fieldError(409, "DUPLICATE", "serie", "Ya existe esta serie en la sucursal")
    }
    if (action === "update" && current && next && next.correlativo < current.correlativo) {
      return fieldError(422, "VALIDATION_ERROR", "correlativo", `El correlativo no puede bajar de ${current.correlativo}`)
    }
    return undefined
  },
})