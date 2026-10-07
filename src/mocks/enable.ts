import { env } from "@/config/env"

/** Activa los datos simulados solo en desarrollo y si VITE_ENABLE_MOCKS=true. */
export async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV || !env.enableMocks) return

  const { worker } = await import("@/mocks/browser")
  await worker.start({
    onUnhandledRequest(request, print) {
      // Navegaciones, archivos de Vite y fuentes también pasan por el worker:
      // no son errores. Solo avisamos de peticiones a la API sin handler.
      if (request.url.startsWith(env.apiBaseUrl)) {
        print.warning()
      }
    },
  })
}