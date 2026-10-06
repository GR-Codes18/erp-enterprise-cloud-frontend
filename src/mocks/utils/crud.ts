import { delay, http, HttpResponse, type RequestHandler } from "msw"
import { env } from "@/config/env"
import type { ApiErrorBody, Paginated } from "@/shared/lib/api/types"

interface CrudOptions<T extends { id: string }> {
  /** Nombre del recurso en la URL, ej. "customers" */
  resource: string
  /** Datos iniciales. Cada registro trae un UUID fijo (predecible para las pruebas) */
  seed: T[]
  /** Campos de texto donde busca el parámetro ?search= */
  searchFields: (keyof T)[]
  /** Latencia simulada en ms, para poder ver los estados de carga */
  latency?: number
}

function errorResponse(status: number, code: string, message: string) {
  const body: ApiErrorBody = { code, message }
  return HttpResponse.json(body, { status })
}

function toPositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return max ? Math.min(parsed, max) : parsed
}

/**
 * Crea los 5 endpoints de un CRUD con paginación y búsqueda, siguiendo el
 * contrato de API. Los datos viven en memoria: se reinician al recargar.
 * Los ids son UUID (texto opaco): los datos semilla traen el suyo y los
 * registros nuevos reciben uno generado con crypto.randomUUID().
 * Para una regla propia de un módulo, registra su handler ANTES de este.
 */
export function createCrudHandlers<T extends { id: string }>({
  resource,
  seed,
  searchFields,
  latency = 400,
}: CrudOptions<T>): RequestHandler[] {
  let items: T[] = [...seed]
  const base = env.apiBaseUrl + "/" + resource

  const notFound = () => errorResponse(404, "NOT_FOUND", "Recurso no encontrado")
  const invalidBody = () =>
    errorResponse(400, "BAD_REQUEST", "El cuerpo de la petición no es válido")

  return [
    http.get(base, async ({ request }) => {
      await delay(latency)
      const params = new URL(request.url).searchParams
      const page = toPositiveInt(params.get("page"), 1)
      const size = toPositiveInt(params.get("size"), 20, 100)
      const search = (params.get("search") ?? "").trim().toLowerCase()

      const filtered = search
        ? items.filter((item) =>
            searchFields.some((field) =>
              String(item[field] ?? "").toLowerCase().includes(search),
            ),
          )
        : items

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
      let data: Partial<T>
      try {
        data = (await request.json()) as Partial<T>
      } catch {
        return invalidBody()
      }
      // El id va después del spread: el cliente nunca puede imponer el suyo
      const created = { ...data, id: crypto.randomUUID() } as T
      items = [...items, created]
      return HttpResponse.json(created, { status: 201 })
    }),

    ...(["put", "patch"] as const).map((method) =>
      http[method](base + "/:id", async ({ request, params }) => {
        await delay(latency)
        const index = items.findIndex((candidate) => candidate.id === params.id)
        if (index === -1) return notFound()
        let data: Partial<T>
        try {
          data = (await request.json()) as Partial<T>
        } catch {
          return invalidBody()
        }
        const updated = { ...items[index], ...data, id: items[index].id }
        items = items.map((item, i) => (i === index ? updated : item))
        return HttpResponse.json(updated)
      }),
    ),

    http.delete(base + "/:id", async ({ params }) => {
      await delay(latency)
      const exists = items.some((candidate) => candidate.id === params.id)
      if (!exists) return notFound()
      items = items.filter((candidate) => candidate.id !== params.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}