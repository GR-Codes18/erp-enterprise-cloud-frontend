import type { RequestHandler } from "msw"
import { authHandlers } from "@/modules/auth/mocks"
import { roleHandlers } from "@/modules/administration/usuarios/roles/mocks"
import { userHandlers } from "@/modules/administration/usuarios/users/mocks"
import { customerHandlers } from "@/modules/maintenance/customers/mocks"
import { supplierHandlers } from "@/modules/maintenance/suppliers/mocks"

/** Aquí se agregan los handlers de cada módulo (modules/<módulo>/.../mocks). */
export const handlers: RequestHandler[] = [
  ...customerHandlers,
  ...supplierHandlers,
  ...roleHandlers,
  ...userHandlers,
  ...authHandlers,
]