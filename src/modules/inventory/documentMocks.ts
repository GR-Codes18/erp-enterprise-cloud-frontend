import { delay, http, HttpResponse, type RequestHandler } from "msw"
import { env } from "@/config/env"
import type { ApiErrorBody, Paginated } from "@/shared/lib/api/types"
import { applyListFilters } from "@/mocks/utils/filters"
import type { z } from "zod"

interface InventoryAction<S extends string> {
  action: string
  from: S
  to: S
}

interface InventoryDocumentOptions<
  T extends { id: string; status: S; created_at: string },
  I extends object,
  S extends string,
> {
  resource: string
  seed: T[]
  searchFields: (keyof T)[]
  filterFields: (keyof T)[]
  dateField: keyof T
  inputSchema: z.ZodType<I>
  actions: InventoryAction<S>[]
  createRecord: (input: I, id: string, createdAt: string) => T
  updateRecord: (current: T, input: I) => T
}

function errorResponse(status: number, code: string, message: string, errors?: ApiErrorBody["errors"]) {
  const body: ApiErrorBody = { code, message, ...(errors ? { errors } : {}) }
  return HttpResponse.json(body, { status })
}

function positiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return max ? Math.min(parsed, max) : parsed
}

/** CRUD simulado para documentos de inventario; las acciones solo cambian el estado, no el stock. */
export function createInventoryDocumentHandlers<
  T extends { id: string; status: S; created_at: string },
  I extends object,
  S extends string,
>({
  resource,
  seed,
  searchFields,
  filterFields,
  dateField,
  inputSchema,
  actions,
  createRecord,
  updateRecord,
}: InventoryDocumentOptions<T, I, S>): RequestHandler[] {
  let items = [...seed]
  const base = `${env.apiBaseUrl}/${resource}`
  const notFound = () => errorResponse(404, "NOT_FOUND", "Recurso no encontrado")
  const invalidBody = () => errorResponse(400, "BAD_REQUEST", "El cuerpo de la petición no es válido")

  return [
    http.get(base, async ({ request }) => {
      await delay(250)
      const params = new URL(request.url).searchParams
      const result = applyListFilters(items, params, { searchFields, filterFields, dateField })
      if (!result.ok) return errorResponse(result.status, result.code, result.message)
      const page = positiveInt(params.get("page"), 1)
      const size = positiveInt(params.get("size"), 20, 100)
      const body: Paginated<T> = {
        items: result.items.slice((page - 1) * size, page * size),
        total: result.items.length,
        page,
        size,
        pages: Math.max(1, Math.ceil(result.items.length / size)),
      }
      return HttpResponse.json(body)
    }),
    http.get(`${base}/:id`, async ({ params }) => {
      await delay(150)
      const item = items.find((candidate) => candidate.id === params.id)
      return item ? HttpResponse.json(item) : notFound()
    }),
    http.post(base, async ({ request }) => {
      await delay(250)
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return invalidBody()
      }
      const parsed = inputSchema.safeParse(body)
      if (!parsed.success) {
        return errorResponse(
          422,
          "VALIDATION_ERROR",
          "Revisa los datos ingresados.",
          parsed.error.issues.map((issue) => ({
            field: issue.path.map(String).join("."),
            message: issue.message,
          })),
        )
      }
      const record = createRecord(parsed.data, crypto.randomUUID(), new Date().toISOString())
      items = [...items, record]
      return HttpResponse.json(record, { status: 201 })
    }),
    http.put(`${base}/:id`, async ({ request, params }) => {
      await delay(250)
      const current = items.find((candidate) => candidate.id === params.id)
      if (!current) return notFound()
      if (current.status !== "draft") {
        return errorResponse(409, "INVALID_STATE", "Solo se pueden editar documentos en borrador.")
      }
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return invalidBody()
      }
      const parsed = inputSchema.safeParse(body)
      if (!parsed.success) {
        return errorResponse(
          422,
          "VALIDATION_ERROR",
          "Revisa los datos ingresados.",
          parsed.error.issues.map((issue) => ({
            field: issue.path.map(String).join("."),
            message: issue.message,
          })),
        )
      }
      const updated = updateRecord(current, parsed.data)
      items = items.map((candidate) => (candidate.id === current.id ? updated : candidate))
      return HttpResponse.json(updated)
    }),
    http.delete(`${base}/:id`, async ({ params }) => {
      await delay(200)
      const current = items.find((candidate) => candidate.id === params.id)
      if (!current) return notFound()
      if (current.status !== "draft") {
        return errorResponse(409, "INVALID_STATE", "Solo se pueden eliminar documentos en borrador.")
      }
      items = items.filter((candidate) => candidate.id !== current.id)
      return new HttpResponse(null, { status: 204 })
    }),
    ...actions.map(({ action, from, to }) =>
      http.post(`${base}/:id/${action}`, async ({ params }) => {
        await delay(250)
        const current = items.find((candidate) => candidate.id === params.id)
        if (!current) return notFound()
        if (current.status !== from) {
          return errorResponse(409, "INVALID_STATE", "La acción no está permitida para el estado actual.")
        }
        const updated = { ...current, status: to }
        items = items.map((candidate) => (candidate.id === current.id ? updated : candidate))
        return HttpResponse.json(updated)
      }),
    ),
  ]
}
