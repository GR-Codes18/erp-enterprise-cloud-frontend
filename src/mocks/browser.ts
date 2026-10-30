import { setupWorker } from "msw/browser"
import { handlers } from "@/mocks/handlers"
import { connectIntegrationHub } from "@/mocks/integration/hub"

export const worker = setupWorker(...handlers)

// Cada cambio en un módulo se refleja en Bitácora, Auditoría y Notificaciones
connectIntegrationHub(worker)
