import type { RequestHandler } from "msw"
import { authHandlers } from "@/modules/auth/mocks"
import { auditHandlers } from "@/modules/administration/audit/mocks"
import { permissionHandlers } from "@/modules/administration/permissions/mocks"
import { roleHandlers } from "@/modules/administration/usuarios/roles/mocks"
import { userHandlers } from "@/modules/administration/usuarios/users/mocks"
import { settingsHandlers } from "@/modules/administration/settings/mocks"
import { documentHandlers } from "@/modules/documents/files/mocks"
import { customerHandlers } from "@/modules/maintenance/customers/mocks"
import { supplierHandlers } from "@/modules/maintenance/suppliers/mocks"
import { categoryHandlers } from "@/modules/maintenance/categories/mocks"
import { warehouseHandlers } from "@/modules/maintenance/warehouses/mocks"

/** Aquí se agregan los handlers de cada módulo (modules/<módulo>/.../mocks). */
export const handlers: RequestHandler[] = [
  ...customerHandlers,
  ...supplierHandlers,
  ...categoryHandlers,
  ...warehouseHandlers,
  ...roleHandlers,
  ...userHandlers,
  ...auditHandlers,
  ...settingsHandlers,
  ...permissionHandlers,
  ...documentHandlers,
  ...authHandlers,
]