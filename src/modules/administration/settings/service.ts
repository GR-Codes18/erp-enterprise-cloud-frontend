import { api } from "@/shared/lib/api/client"
import type { Settings, SettingsInput } from "./schema"

/** La configuración es UN solo registro: recurso singular (contrato, sección 14) */
export const settingsService = {
  get: (signal?: AbortSignal) => api.get<Settings>("/settings", { signal }),
  update: (input: SettingsInput) => api.put<Settings>("/settings", input),
}
