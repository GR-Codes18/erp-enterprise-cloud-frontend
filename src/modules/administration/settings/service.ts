import { api } from "@/shared/lib/api/client"
import type { Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { Settings, SettingsInput } from "./schema"

const BASE = "/settings"

/**
 * La configuración es UN solo registro. Mientras el contrato no defina una ruta singular,
 * se trata como una colección de una fila: se lee con size=1 y se actualiza por id.
 * Cuando el backend decida, solo cambian estas dos funciones.
 */
export const settingsService = {
  get: async (signal?: AbortSignal): Promise<Settings> => {
    const page = await api.get<Paginated<Settings>>(BASE, {
      query: toListQuery({ page: 1, size: 1 }),
      signal,
    })
    const current = page.items[0]
    if (!current) throw new Error("No hay configuración registrada")
    return current
  },

  update: (id: string, input: SettingsInput) =>
    api.put<Settings>(`${BASE}/${encodeURIComponent(id)}`, input),
}