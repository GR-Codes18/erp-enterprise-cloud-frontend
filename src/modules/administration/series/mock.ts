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

export const seriesHandlers = createCrudHandlers<DocumentSeries>({
  resource: "series",
  seed,
  searchFields: ["tipo_documento", "serie", "sucursal_id"],
  filterFields: ["tipo_documento", "sucursal_id", "vigencia"],
})