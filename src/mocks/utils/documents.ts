import { delay, http, HttpResponse, type RequestHandler } from "msw"
import type { z } from "zod"
import { env } from "@/config/env"
import type { ApiErrorBody, Paginated } from "@/shared/lib/api/types"
import { previewTotals } from "@/shared/lib/lines"
import { fromCents } from "@/shared/lib/money"
import { reasonSchema } from "@/shared/lib/reasonSchema"
import { applyListFilters } from "@/mocks/utils/filters"
import { newId } from "@/shared/lib/id"
import type { MockRuleError } from "@/mocks/utils/crud"

type Body = Record<string, unknown>

/** Datos en memoria de un tipo de documento, para que otros mocks del mismo módulo los lean o agreguen */
export interface DocumentStore<T extends { id: string }> {
  all: () => readonly T[]
  find: (id: string) => T | undefined
  insert: (record: T) => T
  update: (id: string, patch: Partial<T>) => T | undefined
}

export interface DocumentAction<T, S extends string> {
  /** Segmento de la URL: POST /<recurso>/{id}/<action> */
  action: string
  /** Estados desde los que se permite (si no, 409 INVALID_TRANSITION) */
  from: readonly S[]
  to: S
  /** cancel / void / reject: el cuerpo debe traer { reason } (5 a 255 caracteres) */
  requiresReason?: boolean
  /** Regla de negocio extra que simula el backend (stock, crédito, RUC...) */
  check?: (current: T, body: Body, request: Request) => MockRuleError | undefined
  /** Cambios además del estado (ej. motivo, fecha de anulación) */
  apply?: (current: T, body: Body) => Partial<T>
  /** Efecto DENTRO del mismo módulo (ej. crear el pedido de una cotización). Lo que devuelve es la respuesta */
  respond?: (updated: T, body: Body) => object
}

interface DocumentOptions<T extends { id: string; status: S }, I, S extends string> {
  resource: string
  seed: T[]
  searchFields: (keyof T)[]
  filterFields: (keyof T)[]
  dateField?: keyof T
  /** Sin inputSchema el recurso no se crea ni se edita por la API (ej. comprobantes, que nacen de un pedido) */
  inputSchema?: z.ZodType<I>
  createRecord?: (input: I, id: string, createdAt: string, items: readonly T[], request: Request) => T | MockRuleError
  updateRecord?: (current: T, input: I) => T | MockRuleError
  /** Estado en el que se edita y se borra. Por defecto "draft" */
  editableStatus?: S
  /** false: el documento nunca se borra por la API (se anula con una acción) */
  allowDelete?: boolean
  actions?: DocumentAction<T, S>[]
  latency?: number
}

function errorResponse(status: number, code: string, message: string, errors?: ApiErrorBody["errors"]) {
  const body: ApiErrorBody = { code, message, ...(errors ? { errors } : {}) }
  return HttpResponse.json(body, { status })
}

const ruleError = ({ status, ...body }: MockRuleError) => HttpResponse.json<ApiErrorBody>(body, { status })

const isRuleError = (value: unknown): value is MockRuleError =>
  typeof value === "object" && value !== null && "status" in value && "code" in value && "message" in value

function positiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return max ? Math.min(parsed, max) : parsed
}

const validationError = (issues: z.core.$ZodIssue[]) =>
  errorResponse(
    422,
    "VALIDATION_ERROR",
    "Revisa los datos ingresados.",
    issues.map((issue) => ({ field: issue.path.map(String).join("."), message: issue.message })),
  )

/**
 * Documentos con estados (cotizaciones, pedidos, transferencias...): listado, detalle,
 * alta y edición solo en borrador, y una ruta por acción de estado (contrato, sección 5.1).
 * Los efectos en OTROS módulos (stock, cuentas por cobrar...) no se simulan.
 */
export function createDocumentHandlers<T extends { id: string; status: S }, I, S extends string>({
  resource,
  seed,
  searchFields,
  filterFields,
  dateField,
  inputSchema,
  createRecord,
  updateRecord,
  editableStatus = "draft" as S,
  allowDelete = true,
  actions = [],
  latency = 250,
}: DocumentOptions<T, I, S>): { handlers: RequestHandler[]; store: DocumentStore<T> } {
  let items = [...seed]
  const base = `${env.apiBaseUrl}/${resource}`

  const store: DocumentStore<T> = {
    all: () => items,
    find: (id) => items.find((item) => item.id === id),
    insert: (record) => {
      items = [record, ...items]
      return record
    },
    update: (id, patch) => {
      const current = items.find((item) => item.id === id)
      if (!current) return undefined
      const updated = { ...current, ...patch, id: current.id }
      items = items.map((item) => (item.id === id ? updated : item))
      return updated
    },
  }

  const notFound = () => errorResponse(404, "NOT_FOUND", "Recurso no encontrado")
  const invalidBody = () => errorResponse(400, "BAD_REQUEST", "El cuerpo de la petición no es válido")
  const readBody = async (request: Request): Promise<Body | undefined> => {
    try {
      const body: unknown = await request.json()
      return typeof body === "object" && body !== null ? (body as Body) : undefined
    } catch {
      return undefined
    }
  }

  const handlers: RequestHandler[] = [
    http.get(base, async ({ request }) => {
      await delay(latency)
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
      await delay(latency)
      const item = store.find(String(params.id))
      return item ? HttpResponse.json(item) : notFound()
    }),

    ...actions.map(({ action, from, to, requiresReason, check, apply, respond }) =>
      http.post(`${base}/:id/${action}`, async ({ request, params }) => {
        await delay(latency)
        const current = store.find(String(params.id))
        if (!current) return notFound()
        const body = (await readBody(request)) ?? {}
        if (requiresReason) {
          const parsed = reasonSchema.safeParse(body)
          if (!parsed.success) return validationError(parsed.error.issues)
        }
        if (!from.includes(current.status)) {
          return errorResponse(409, "INVALID_TRANSITION", "La acción no está permitida en el estado actual del documento.")
        }
        const rejected = check?.(current, body, request)
        if (rejected) return ruleError(rejected)
        const updated = store.update(current.id, { ...apply?.(current, body), status: to } as Partial<T>) as T
        return HttpResponse.json((respond ? respond(updated, body) : updated) as Record<string, unknown>)
      }),
    ),
  ]

  if (inputSchema && createRecord && updateRecord) {
    handlers.push(
      http.post(base, async ({ request }) => {
        await delay(latency)
        const body = await readBody(request)
        if (!body) return invalidBody()
        const parsed = inputSchema.safeParse(body)
        if (!parsed.success) return validationError(parsed.error.issues)
        const record = createRecord(parsed.data, newId(), new Date().toISOString(), items, request)
        if (isRuleError(record)) return ruleError(record)
        return HttpResponse.json(store.insert(record), { status: 201 })
      }),

      http.put(`${base}/:id`, async ({ request, params }) => {
        await delay(latency)
        const current = store.find(String(params.id))
        if (!current) return notFound()
        if (current.status !== editableStatus) {
          return errorResponse(409, "INVALID_TRANSITION", "Solo se pueden editar documentos en borrador.")
        }
        const body = await readBody(request)
        if (!body) return invalidBody()
        const parsed = inputSchema.safeParse(body)
        if (!parsed.success) return validationError(parsed.error.issues)
        const updated = updateRecord(current, parsed.data)
        if (isRuleError(updated)) return ruleError(updated)
        return HttpResponse.json(store.update(current.id, updated))
      }),

      http.delete(`${base}/:id`, async ({ params }) => {
        await delay(latency)
        const current = store.find(String(params.id))
        if (!current) return notFound()
        if (!allowDelete || current.status !== editableStatus) {
          return errorResponse(409, "INVALID_TRANSITION", "Solo se pueden eliminar documentos en borrador.")
        }
        items = items.filter((item) => item.id !== current.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
  }

  return { handlers, store }
}

/** Siguiente número correlativo con prefijo: ("COT", 7) -> "COT-000007" */
export const nextNumber = (prefix: string, count: number) => `${prefix}-${String(count).padStart(6, "0")}`

/** Totales oficiales que calcularía el backend, como texto decimal del contrato */
export function totalsOf(lines: readonly { quantity: number; unit_price: string }[]) {
  const { subtotalCents, igvCents, totalCents } = previewTotals(lines)
  return { subtotal: fromCents(subtotalCents), igv: fromCents(igvCents), total: fromCents(totalCents) }
}
