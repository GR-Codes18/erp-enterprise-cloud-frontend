import { createCrudHandlers } from "@/mocks/utils/crud"
import { permissionSeed } from "../../permissions/mocks"
import { permissionKey } from "../../permissions/schema"
import { isRoleInUse } from "../users/mocks"
import { roleId } from "./mockIds"
import { checkRoleRules } from "./mockRules"
import type { Role } from "./schema"

export { roleId }

/** Todos los permisos del catálogo cuyas pantallas empiezan por alguno de los prefijos */
const permissionsFor = (...prefixes: string[]) =>
  permissionSeed
    .filter((screen) => prefixes.some((prefix) => screen.code.startsWith(prefix)))
    .flatMap((screen) => screen.actions.map((action) => permissionKey(screen.code, action)))
    .sort()

/** Solo "Ver" en las pantallas indicadas */
const viewOnly = (...prefixes: string[]) =>
  permissionSeed
    .filter((screen) => prefixes.some((prefix) => screen.code.startsWith(prefix)))
    .map((screen) => permissionKey(screen.code, "view"))
    .sort()

const role = (
  n: number,
  name: string,
  description: string,
  permissions: string[],
  is_system = false,
): Role => ({
  id: roleId(n),
  name,
  description,
  permissions: Array.from(new Set(permissions)).sort(),
  is_system,
})

// 12 registros para poder ver la paginación con size=10
export const roleSeed: Role[] = [
  role(1, "Administrador", "Acceso total al sistema, configuración y auditoría.", permissionsFor(""), true),
  role(2, "Gerente / Director", "Dashboard ejecutivo, finanzas, analítica y aprobaciones.", [
    ...viewOnly(""),
    ...permissionsFor("dashboard", "reports"),
    "sales.orders:approve",
    "purchases.requests:approve",
    "inventory.adjustments:approve",
  ]),
  role(3, "Operador Comercial / Ventas", "Módulo comercial y consulta de stock.", [
    ...permissionsFor("sales.quotes", "sales.orders", "sales.invoices"),
    ...viewOnly("inventory.stock", "maintenance.customers", "maintenance.products"),
  ]),
  role(4, "Encargado de Compras", "Módulo de compras y catálogo de productos.", [
    ...permissionsFor("purchases.orders", "purchases.invoices", "purchases.returns"),
    ...permissionsFor("maintenance.suppliers"),
    ...viewOnly("purchases.requests", "maintenance.products", "inventory.stock"),
  ]),
  role(5, "Almacenero / Logística", "Inventario y recepción de mercadería.", [
    ...viewOnly("inventory.stock", "inventory.kardex", "inventory.adjustments"),
    ...permissionsFor("inventory.transfers", "purchases.receptions"),
    "inventory.adjustments:create",
    "inventory.adjustments:edit",
  ]),
  role(6, "Personal de Finanzas", "Cuentas por cobrar y pagar, caja y bancos.", [
    ...permissionsFor("finance"),
    ...viewOnly("sales.invoices", "purchases.invoices"),
  ]),
  role(7, "Supervisor de Almacén", "Aprueba ajustes y controla el inventario.", [
    ...permissionsFor("inventory"),
    ...viewOnly("maintenance.warehouses", "maintenance.products"),
  ]),
  role(8, "Cajero", "Registra cobros en caja.", [
    ...viewOnly("finance.receivables", "finance.collections", "finance.cash_small", "sales.invoices"),
    "finance.cash:create",
    "finance.cash:view",
    "finance.payments:view",
    "finance.collections:create",
    "finance.cash_small:create",
  ]),
  role(9, "Asistente de Compras", "Registra solicitudes de compra.", [
    "purchases.requests:create",
    "purchases.requests:edit",
    "purchases.requests:view",
    ...viewOnly("maintenance.products"),
  ]),
  role(10, "Contador", "Consulta estados de cuenta y reportes.", [
    ...viewOnly("finance", "sales.invoices", "purchases.invoices", "reports"),
  ]),
  role(11, "Auditor Interno", "Revisa la auditoría del sistema.", [
    ...viewOnly("administration.audit", "administration.users", "administration.roles"),
  ]),
  role(12, "Asistente Documental", "Gestiona el archivo de documentos.", permissionsFor("documents")),
]

export const roleHandlers = createCrudHandlers<Role>({
  resource: "roles",
  seed: roleSeed,
  searchFields: ["name", "description"],
  filterFields: [],
  // Un rol nuevo nunca es de sistema, lo envíe o no el cliente
  createdFields: { is_system: false },
  validate: (write) => checkRoleRules(write, isRoleInUse),
})
