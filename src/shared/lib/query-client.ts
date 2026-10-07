import { QueryClient } from "@tanstack/react-query"
import { isApiError } from "@/shared/lib/api/errors"

/** No reintenta errores 4xx (el resultado no cambiará); reintenta una vez los demás. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
  },
})
