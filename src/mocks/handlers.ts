import type { RequestHandler } from "msw"
import { authHandlers } from "@/modules/auth/mocks"
import { customerHandlers } from "@/modules/maintenance/customers/mocks"

/** Aquí se agregan los handlers de cada módulo (modules/<módulo>/.../mocks). */
export const handlers: RequestHandler[] = [
  ...customerHandlers,
  ...authHandlers,
]