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
import { productHandlers } from "@/modules/maintenance/products/mocks"
import { stockHandlers } from "@/modules/inventory/stock/mocks"
import { kardexHandlers } from "@/modules/inventory/kardex/mocks"
import { transferHandlers } from "@/modules/inventory/transfers/mocks"
import { adjustmentHandlers } from "@/modules/inventory/adjustments/mocks"
import { salesHandlers } from "@/modules/sales/mocks"
import { purchaseHandlers } from "@/modules/purchases/mocks"
import { financeHandlers } from "@/modules/finance/mocks"
import { reportHandlers } from "@/modules/reports/mocks"

/** Aquí se agregan los handlers de cada módulo (modules/<módulo>/.../mocks). */
export const handlers: RequestHandler[] = [
  ...customerHandlers,
  ...supplierHandlers,
  ...categoryHandlers,
  ...warehouseHandlers,
  ...productHandlers,
  ...roleHandlers,
  ...userHandlers,
  ...auditHandlers,
  ...settingsHandlers,
  ...permissionHandlers,
  ...documentHandlers,
  ...authHandlers,
  ...stockHandlers,
  ...kardexHandlers,
  ...transferHandlers,
  ...adjustmentHandlers,
  ...salesHandlers,
  ...purchaseHandlers,
  ...financeHandlers,
  ...reportHandlers,
]