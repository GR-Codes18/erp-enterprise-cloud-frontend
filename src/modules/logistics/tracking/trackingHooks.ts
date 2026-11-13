import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { trackingService } from "./trackingService"

/** Cada cuántos ms se pide la posición. Si el backend ofrece WebSocket/SSE, se reemplaza aquí. */
export const LIVE_REFRESH_MS = 4000

export function useLiveTracking() {
  return useQuery({
    queryKey: ["logistics-tracking", "live"],
    queryFn: ({ signal }) => trackingService.live(signal),
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  })
}
