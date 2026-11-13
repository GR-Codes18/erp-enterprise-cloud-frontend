import { api } from "@/shared/lib/api/client"
import type { LiveTrackingResponse } from "./tracking"

export const trackingService = {
  /** Viajes con su posición GPS, paradas y tiempos. Cuando exista el backend: GET /logistics/tracking/live */
  live: (signal?: AbortSignal) => api.get<LiveTrackingResponse>("/logistics/tracking/live", { signal }),
}
