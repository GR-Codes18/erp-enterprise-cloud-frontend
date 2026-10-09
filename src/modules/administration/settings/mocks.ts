import { delay, http, HttpResponse } from "msw"
import { env } from "@/config/env"
import type { ApiErrorBody } from "@/shared/lib/api/types"
import { settingsInputSchema, type Settings } from "./schema"

/** UUID fijo con el prefijo de configuración (8014) */
let settings: Settings = {
  id: "00000000-0000-4000-8014-000000000001",
  company_ruc: "20600000001",
  company_name: "Enterprise Cloud S.A.C.",
  company_address: "Av. Javier Prado Este 1234, San Isidro, Lima",
  igv_rate: "18.00",
  currency: "PEN",
  invoice_series: "F001",
  receipt_series: "B001",
  block_negative_stock: true,
}

const base = `${env.apiBaseUrl}/settings`

/** Recurso singular: GET y PUT /settings (el backend registra cada cambio en auditoría) */
export const settingsHandlers = [
  http.get(base, async () => {
    await delay(300)
    return HttpResponse.json(settings)
  }),

  http.put(base, async ({ request }) => {
    await delay(300)
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json<ApiErrorBody>({ code: "BAD_REQUEST", message: "El cuerpo de la petición no es válido" }, { status: 400 })
    }
    const parsed = settingsInputSchema.safeParse(body)
    if (!parsed.success) {
      return HttpResponse.json<ApiErrorBody>(
        {
          code: "VALIDATION_ERROR",
          message: "Revisa los datos ingresados.",
          errors: parsed.error.issues.map((issue) => ({ field: issue.path.map(String).join("."), message: issue.message })),
        },
        { status: 422 },
      )
    }
    settings = { ...settings, ...parsed.data }
    return HttpResponse.json(settings)
  }),
]
