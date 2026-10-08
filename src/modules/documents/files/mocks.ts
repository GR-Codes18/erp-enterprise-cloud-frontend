import { http, HttpResponse } from "msw"
import { documentInputSchema, type DocumentRecord } from "./schema"

/** UUID fijos con el prefijo de documentos (8020) */
const uuid = (n: number) => `00000000-0000-4000-8020-${String(n).padStart(12, "0")}`
/** Referencias de ejemplo a registros de otros módulos (aún no existen en sus mocks) */
const ref = (n: number) => `00000000-0000-4000-8099-${String(n).padStart(12, "0")}`

// Mismo usuario que "Administrador General" en los mocks de Usuarios (se copia el valor, no se importa)
const ADMIN = { id: "00000000-0000-4000-8010-000000000001", name: "Administrador General" }
const PEDRO = { id: "00000000-0000-4000-8010-000000000008", name: "Pedro Campos Rivas" }
const FIORELLA = { id: "00000000-0000-4000-8010-000000000012", name: "Fiorella Gómez Ríos" }
const CARLA = { id: "00000000-0000-4000-8010-000000000005", name: "Carla Mendoza Ruiz" }

const PDF = "application/pdf"
const PNG = "image/png"
const JPG = "image/jpeg"
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

type Uploader = { id: string; name: string }

const doc = (
  n: number,
  name: string,
  category: DocumentRecord["category"],
  mime_type: string,
  size: number,
  uploader: Uploader,
  uploaded_at: string,
  entity: [DocumentRecord["entity_type"], string, string] = ["", "", ""],
): DocumentRecord => ({
  id: uuid(n),
  name,
  category,
  entity_type: entity[0],
  entity_id: entity[1],
  entity_label: entity[2],
  mime_type,
  size,
  uploaded_by: uploader.id,
  uploaded_by_name: uploader.name,
  uploaded_at,
})

// 12 registros para poder ver la paginación con size=10. Los blobs reales no existen: la subida es simulada
const seed: DocumentRecord[] = [
  doc(1, "Factura F001-00245.pdf", "invoice", PDF, 184_320, FIORELLA, "2026-10-07T14:42:00Z", ["sale", ref(1), "F001-00245"]),
  doc(2, "Orden de compra OC-2026-002.pdf", "order", PDF, 96_256, PEDRO, "2026-10-07T13:10:00Z", ["purchase", ref(2), "OC-2026-002"]),
  doc(3, "Contrato marco Comercial Andina.docx", "contract", DOCX, 412_672, ADMIN, "2026-10-06T21:30:00Z"),
  doc(4, "Guía de remisión T001-0034.pdf", "receipt", PDF, 71_680, PEDRO, "2026-10-06T18:05:00Z", ["purchase", ref(3), "RC-7001"]),
  doc(5, "Conteo físico almacén central.xlsx", "other", XLSX, 358_400, CARLA, "2026-10-06T16:20:00Z", ["adjustment", ref(4), "AJ-0304"]),
  doc(6, "Voucher de transferencia OP-884213.png", "receipt", PNG, 523_264, FIORELLA, "2026-10-05T15:00:00Z", ["payment", ref(5), "PG-5001"]),
  doc(7, "Contrato de alquiler de local.pdf", "contract", PDF, 1_572_864, ADMIN, "2026-10-05T12:40:00Z"),
  doc(8, "Foto de mercadería dañada.jpg", "other", JPG, 2_411_724, PEDRO, "2026-10-04T20:15:00Z", ["purchase", ref(6), "DV-8001"]),
  doc(9, "Comprobante B001-00112.pdf", "receipt", PDF, 65_536, CARLA, "2026-10-03T17:25:00Z", ["sale", ref(7), "B001-00112"]),
  doc(10, "Orden de compra OC-2026-001.pdf", "order", PDF, 90_112, PEDRO, "2026-10-02T14:00:00Z", ["purchase", ref(8), "OC-2026-001"]),
  doc(11, "Política de seguridad de la información.docx", "other", DOCX, 287_744, ADMIN, "2026-10-01T13:30:00Z"),
  doc(12, "Factura de proveedor F005-4410.pdf", "invoice", PDF, 201_728, FIORELLA, "2026-09-30T19:45:00Z", ["purchase", ref(9), "F005-4410"]),
]

// Estado en memoria: al recargar vuelve a los datos semilla
let store: DocumentRecord[] = seed.map((item) => ({ ...item }))
const pending = new Map<string, DocumentRecord>()

const MOCK_STORAGE = "https://mock-s3.local/uploads"

const errorResponse = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status })

const notFound = () => errorResponse(404, "NOT_FOUND", "No se encontró el documento.")

export const documentHandlers = [
  // Listado con búsqueda, filtros exactos, rango de fechas y paginación (formato del contrato)
  http.get("*/documents", ({ request }) => {
    const params = new URL(request.url).searchParams
    const search = (params.get("search") ?? "").trim().toLowerCase()
    const dateFrom = params.get("date_from")
    const dateTo = params.get("date_to")

    let items = store.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search)) return false
      for (const field of ["category", "entity_type", "entity_id"] as const) {
        const value = params.get(field)
        if (value && item[field] !== value) return false
      }
      // Compara contra la fecha UTC: un archivo subido cerca de la medianoche de Lima puede caer en el día siguiente
      const day = item.uploaded_at.slice(0, 10)
      if (dateFrom && day < dateFrom) return false
      if (dateTo && day > dateTo) return false
      return true
    })
    items = [...items].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))

    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1)
    const size = Math.min(100, Math.max(1, Number.parseInt(params.get("size") ?? "20", 10) || 20))
    const total = items.length
    return HttpResponse.json({
      items: items.slice((page - 1) * size, page * size),
      total,
      page,
      size,
      pages: Math.max(1, Math.ceil(total / size)),
    })
  }),

  // Paso 1: metadatos. El documento queda pendiente (no se lista) hasta confirmar la subida
  http.post("*/documents", async ({ request }) => {
    const parsed = documentInputSchema.safeParse(await request.json())
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Revisa los datos ingresados.",
          errors: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? ""),
            message: issue.message,
          })),
        },
        { status: 422 },
      )
    }
    const id = crypto.randomUUID()
    pending.set(id, {
      id,
      name: parsed.data.name,
      category: parsed.data.category,
      entity_type: parsed.data.entity_type,
      entity_id: parsed.data.entity_id,
      entity_label: "",
      mime_type: parsed.data.mime_type,
      size: parsed.data.size,
      uploaded_by: ADMIN.id,
      uploaded_by_name: ADMIN.name,
      uploaded_at: new Date().toISOString(),
    })
    return HttpResponse.json({ id, upload_url: `${MOCK_STORAGE}/${id}` }, { status: 201 })
  }),

  // Paso 2: "S3" simulado. Acepta el archivo y no lo guarda
  http.put(`${MOCK_STORAGE}/:id`, () => new HttpResponse(null, { status: 200 })),

  // Paso 3: confirmar la subida
  http.post("*/documents/:id/confirm", ({ params }) => {
    const id = String(params.id)
    const record = pending.get(id)
    if (!record) return notFound()
    pending.delete(id)
    store = [record, ...store]
    return HttpResponse.json(record)
  }),

  // Eliminación lógica con motivo obligatorio
  http.post("*/documents/:id/void", async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as { reason?: string }
    if (!body.reason || body.reason.trim() === "") {
      return HttpResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Revisa los datos ingresados.",
          errors: [{ field: "reason", message: "Ingresa el motivo" }],
        },
        { status: 422 },
      )
    }
    if (!store.some((item) => item.id === id)) return notFound()
    store = store.filter((item) => item.id !== id)
    return new HttpResponse(null, { status: 204 })
  }),

  // Enlace temporal de descarga. En mocks es un archivo de texto que describe el documento
  http.get("*/documents/:id/download-url", ({ params }) => {
    const record = store.find((item) => item.id === String(params.id))
    if (!record) return notFound()
    const content = `Archivo simulado: ${record.name}`
    return HttpResponse.json({
      url: `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`,
      expires_in: 300,
    })
  }),
]