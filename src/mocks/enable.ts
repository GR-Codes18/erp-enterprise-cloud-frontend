import { env } from "@/config/env"

/** Activa los datos simulados solo en desarrollo y si VITE_ENABLE_MOCKS=true. */
export async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV || !env.enableMocks) return

  const { worker } = await import("@/mocks/browser")
  await worker.start({ onUnhandledRequest: "warn" })
}
