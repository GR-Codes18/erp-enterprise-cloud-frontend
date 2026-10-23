import { delay, http, HttpResponse, type RequestHandler } from "msw"
import { env } from "@/config/env"
import type { ApiErrorBody, Paginated } from "@/shared/lib/api/types"
import { applyListFilters } from "@/mocks/utils/filters"
import { newId } from "@/shared/lib/id"

/** Rechazo de una regla de negocio simulada (lo que respondería el backend) */
export interface MockRuleError extends ApiErrorBody {
  status: number
}

export interface MockWrite<T> {
  action: "create" | "update" | "delete"
  /** Registro tal como está guardado (no existe al crear) */
  current?: T
  /** Registro como quedaría (no existe al borrar) */
  next?: T
  /** Todos los registros actuales del recurso */
  items: readonly T[]
  /** La petición, para reglas que dependen de quién la hace (ej. no desactivarse a sí mismo) */
  request?: Request
}

export interface UniqueField<T> {
  field: keyof T
  /** Cómo se nombra en el mensaje: "Ya existe un registro con este <label>" */
  label: string
  /** Normalización antes de comparar. Por defecto: sin espacios y en minúsculas */
  normalize?: (value: unknown) => string
}

type Body = Record<string, unknown>

export interface CrudOptions<T extends { id: string }> {
  /** Nombre del recurso en la URL, ej. "customers" o "inventory/stock" */
  resource: string
  /** Datos iniciales. Cada registro trae un UUID fijo (predecible para las pruebas) */
  seed: T[]
  /** Campos de texto donde busca el parámetro ?search= */
  searchFields: (keyof T)[]
  /** Campos que aceptan filtro exacto, ej. ["status"] */
  filterFields?: (keyof T)[]
  /** Campo de fecha ISO sobre el que actúa el rango date_from / date_to */
  dateField?: keyof T
  /** Latencia simulada en ms, para poder ver los estados de carga */
  latency?: number
  /** Dónde aparece un registro nuevo en el listado. Los catálogos lo muestran primero */
  insertAt?: "start" | "end"
  /** Normaliza el cuerpo de un alta (trim, mayúsculas, valores por defecto...) */
  prepareCreate?: (body: Body) => Partial<T>
  /** Normaliza el cuerpo de una edición completa (PUT) */
  prepareUpdate?: (current: T, body: Body) => Partial<T>
  /** Campos que fija el servidor al crear, ej. { is_system: false }: el cliente no puede imponerlos */
  createdFields?: Partial<T>
  /** Campos que no cambian después de crear (ej. el número de documento) */
  immutableFields?: (keyof T)[]
  /** Campos únicos: un duplicado responde 409 con el error en su campo */
  uniqueFields?: UniqueField<T>[]
  /** Un registro en uso no se borra (409 IN_USE): la interfaz ofrece desactivarlo */
  isInUse?: (item: T) => boolean
  inUseMessage?: string
  /** Reglas de negocio propias del recurso: devuelve un error para rechazar la escritura */
  validate?: (write: MockWrite<T>) => MockRuleError | undefined
  /** Avisa cada vez que cambian los datos (para que otros mocks los consulten) */
  onChange?: (items: readonly T[]) => void
}

function errorResponse(status: number, code: string, message: string) {
  const body: ApiErrorBody = { code, message }
  return HttpResponse.json(body, { status })
}

function ruleErrorResponse({ status, ...body }: MockRuleError) {
  return HttpResponse.json<ApiErrorBody>(body, { status })
}

function toPositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return max ? Math.min(parsed, max) : parsed
}

const defaultNormalize = (value: unknown) => String(value ?? "").trim().toLowerCase()

/** Busca un duplicado de algún campo único entre los demás registros */
export function findDuplicate<T extends { id: string }>(
  next: T,
  items: readonly T[],
  uniqueFields: UniqueField<T>[],
): MockRuleError | undefined {
  for (const { field, label, normalize = defaultNormalize } of uniqueFields) {
    const value = normalize(next[field])
    if (value === "") continue
    if (items.some((item) => item.id !== next.id && normalize(item[field]) === value)) {
      const message = `Ya existe un registro con este ${label}`
      return {
        status: 409,
        code: "DUPLICATE",
        message,
        errors: [{ field: String(field), message }],
      }
    }
  }
  return undefined
}

/**
 * Crea los endpoints de un CRUD (listar, ver, crear, editar con PUT o PATCH y borrar)
 * siguiendo el contrato de API: paginación, búsqueda, filtros, rango de fechas y
 * errores { code, message, errors }. Los datos viven en memoria: se reinician al recargar.
 * Los ids son UUID (texto opaco): los datos semilla traen el suyo y los registros
 * nuevos reciben uno generado con crypto.randomUUID(), que nunca choca tras un borrado.
 * Para una ruta propia de un módulo (ej. una acción /confirm), registra su handler ANTES de este.
 */
export function createCrudHandlers<T extends { id: string }>({
  resource,
  seed,
  searchFields,
  filterFields,
  dateField,
  latency = 400,
  insertAt = "end",
  prepareCreate,
  prepareUpdate,
  createdFields,
  immutableFields = [],
  uniqueFields = [],
  isInUse,
  inUseMessage = "El registro está en uso y no se puede eliminar. Puedes desactivarlo.",
  validate,
  onChange,
}: CrudOptions<T>): RequestHandler[] {
  let items: T[] = [...seed]
  onChange?.(items)
  const base = env.apiBaseUrl + "/" + resource
  const save = (next: T[]) => {
    items = next
    onChange?.(items)
  }

  // Reglas comunes primero (duplicados, en uso) y después las propias del recurso
  const check = (write: MockWrite<T>): MockRuleError | undefined => {
    if (write.next) {
      const duplicate = findDuplicate(write.next, items, uniqueFields)
      if (duplicate) return duplicate
    }
    if (write.action === "delete" && write.current && isInUse?.(write.current)) {
      return { status: 409, code: "IN_USE", message: inUseMessage }
    }
    return validate?.(write)
  }

  const notFound = () => errorResponse(404, "NOT_FOUND", "Recurso no encontrado")
  const invalidBody = () =>
    errorResponse(400, "BAD_REQUEST", "El cuerpo de la petición no es válido")

  const readBody = async (request: Request): Promise<Body | undefined> => {
    try {
      const body: unknown = await request.json()
      return typeof body === "object" && body !== null ? (body as Body) : undefined
    } catch {
      return undefined
    }
  }

  return [
    http.get(base, async ({ request }) => {
      await delay(latency)
      const params = new URL(request.url).searchParams
      const page = toPositiveInt(params.get("page"), 1)
      const size = toPositiveInt(params.get("size"), 20, 100)
      const result = applyListFilters(items, params, { searchFields, filterFields, dateField })

      if (!result.ok) return errorResponse(result.status, result.code, result.message)
      const filtered = result.items

      const body: Paginated<T> = {
        items: filtered.slice((page - 1) * size, page * size),
        total: filtered.length,
        page,
        size,
        pages: Math.max(1, Math.ceil(filtered.length / size)),
      }
      return HttpResponse.json(body)
    }),

    http.get(base + "/:id", async ({ params }) => {
      await delay(latency)
      const item = items.find((candidate) => candidate.id === params.id)
      return item ? HttpResponse.json(item) : notFound()
    }),

    http.post(base, async ({ request }) => {
      await delay(latency)
      const data = await readBody(request)
      if (!data) return invalidBody()
      // El id y los campos del servidor van al final: el cliente nunca puede imponerlos
      const created = {
        ...data,
        ...prepareCreate?.(data),
        ...createdFields,
        id: newId(),
      } as unknown as T
      const rejected = check({ action: "create", next: created, items, request })
      if (rejected) return ruleErrorResponse(rejected)
      save(insertAt === "start" ? [created, ...items] : [...items, created])
      return HttpResponse.json(created, { status: 201 })
    }),

    ...(["put", "patch"] as const).map((method) =>
      http[method](base + "/:id", async ({ request, params }) => {
        await delay(latency)
        const index = items.findIndex((candidate) => candidate.id === params.id)
        if (index === -1) return notFound()
        const data = await readBody(request)
        if (!data) return invalidBody()
        const current = items[index]
        const preserved: Partial<T> = {}
        for (const field of immutableFields) preserved[field] = current[field]
        const updated: T = {
          ...current,
          ...data,
          ...(method === "put" ? prepareUpdate?.(current, data) : undefined),
          ...preserved,
          id: current.id,
        }
        const rejected = check({ action: "update", current, next: updated, items, request })
        if (rejected) return ruleErrorResponse(rejected)
        save(items.map((item, i) => (i === index ? updated : item)))
        return HttpResponse.json(updated)
      }),
    ),

    http.delete(base + "/:id", async ({ params, request }) => {
      await delay(latency)
      const current = items.find((candidate) => candidate.id === params.id)
      if (!current) return notFound()
      const rejected = check({ action: "delete", current, items, request })
      if (rejected) return ruleErrorResponse(rejected)
      save(items.filter((candidate) => candidate.id !== params.id))
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}
