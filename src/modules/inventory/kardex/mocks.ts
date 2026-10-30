import { delay, http, HttpResponse, type RequestHandler } from "msw"
import { env } from "@/config/env"
import { applyListFilters } from "@/mocks/utils/filters"
import type { Paginated } from "@/shared/lib/api/types"
import { getKardexEntries } from "../state"
import { KARDEX_TYPES } from "./schema"

const base = `${env.apiBaseUrl}/inventory/kardex`

const positiveInt = (value: string | null, fallback: number, max?: number) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return max ? Math.min(parsed, max) : parsed
}
const allowedTypes = new Set<string>(KARDEX_TYPES)

export const kardexHandlers: RequestHandler[] = [
  http.get(base, async ({ request }) => {
    await delay(250)
    const params = new URL(request.url).searchParams
    const requestedTypes = params.get("types")?.split(",").filter(Boolean) ?? []
    if (requestedTypes.some((type) => !allowedTypes.has(type))) {
      return HttpResponse.json(
        { code: "VALIDATION_ERROR", message: "El filtro de tipos de movimiento no es válido." },
        { status: 422 },
      )
    }
    const items = getKardexEntries().filter((item) => requestedTypes.length === 0 || requestedTypes.includes(item.type))
    const result = applyListFilters(items, params, {
      searchFields: ["reference"],
      filterFields: ["product_id", "warehouse_id"],
      dateField: "occurred_at",
    })
    if (!result.ok) {
      return HttpResponse.json({ code: result.code, message: result.message }, { status: result.status })
    }
    const page = positiveInt(params.get("page"), 1)
    const size = positiveInt(params.get("size"), 20, 100)
    const body: Paginated<typeof items[number]> = {
      items: result.items.slice((page - 1) * size, page * size),
      total: result.items.length,
      page,
      size,
      pages: Math.max(1, Math.ceil(result.items.length / size)),
    }
    return HttpResponse.json(body)
  }),

  http.get(`${base}/:id`, async ({ params }) => {
    await delay(250)
    const row = getKardexEntries().find((item) => item.id === params.id)
    if (!row) {
      return HttpResponse.json({ code: "NOT_FOUND", message: "Recurso no encontrado" }, { status: 404 })
    }
    return HttpResponse.json(row)
  }),
]