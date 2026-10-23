import { env } from "@/config/env"

/**
 * Activa los datos simulados (MSW) cuando VITE_ENABLE_MOCKS=true.
 * Funciona también en builds de producción (por ejemplo, una demo en Vercel).
 * Para usar el backend real: VITE_ENABLE_MOCKS=false y volver a desplegar,
 * porque las variables VITE_ se escriben en el build.
 */
export async function enableMocking(): Promise<void> {
  if (!env.enableMocks) return

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations.map(async (registration) => {
        await registration.unregister()
      }),
    )
  }

  const { worker } = await import("@/mocks/browser")
  await worker.start({
    serviceWorker: {
      url: "/mockServiceWorker.js",
      options: {
        scope: "/",
      },
    },
    onUnhandledRequest(request, print) {
      // Navegaciones, archivos y fuentes también pasan por el worker:
      // no son errores. Solo avisamos de peticiones a la API sin handler.
      if (request.url.startsWith(env.apiBaseUrl)) {
        print.warning()
      }
    },
  })
}