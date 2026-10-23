import { createCrudHandlers } from "@/mocks/utils/crud"
import type { PermissionAction, PermissionScreen } from "./schema"

/** UUID fijos con el prefijo de permisos (8013) */
const uuid = (n: number) => `00000000-0000-4000-8013-${String(n).padStart(12, "0")}`

const V: PermissionAction[] = ["view"]
const CRUD: PermissionAction[] = ["view", "create", "edit", "void"]

const screen = (
  n: number,
  module: string,
  module_label: string,
  code: string,
  label: string,
  actions: PermissionAction[],
): PermissionScreen => ({ id: uuid(n), code, module, module_label, label, actions })

// Solo existen las acciones que tienen sentido en cada pantalla (por ejemplo, Stock solo se consulta)
export const permissionSeed: PermissionScreen[] = [
  screen(1, "dashboard", "Dashboard", "dashboard.summary", "Indicadores", V),

  screen(2, "sales", "Ventas", "sales.quotes", "Cotizaciones", CRUD),
  screen(3, "sales", "Ventas", "sales.orders", "Orden de venta", [...CRUD, "approve"]),
  screen(4, "sales", "Ventas", "sales.invoices", "Comprobantes", ["view", "create", "void"]),
  screen(5, "sales", "Ventas", "sales.returns", "Devoluciones", ["view", "create", "void", "approve"]),

  screen(6, "purchases", "Compras", "purchases.requests", "Solicitudes", [...CRUD, "approve"]),
  screen(7, "purchases", "Compras", "purchases.orders", "Órdenes", CRUD),
  screen(8, "purchases", "Compras", "purchases.receptions", "Recepciones", ["view", "create", "void"]),
  screen(9, "purchases", "Compras", "purchases.invoices", "Facturas de proveedor", ["view", "create", "void"]),
  screen(10, "purchases", "Compras", "purchases.returns", "Devoluciones", ["view", "create", "void"]),

  screen(11, "inventory", "Inventario", "inventory.stock", "Stock", V),
  screen(12, "inventory", "Inventario", "inventory.kardex", "Kardex", V),
  screen(13, "inventory", "Inventario", "inventory.transfers", "Transferencias", CRUD),
  screen(14, "inventory", "Inventario", "inventory.adjustments", "Ajustes", ["view", "create", "edit", "approve"]),

  screen(15, "finance", "Finanzas", "finance.receivables", "Cuentas por cobrar", V),
  screen(16, "finance", "Finanzas", "finance.payables", "Cuentas por pagar", V),
  screen(17, "finance", "Finanzas", "finance.payments", "Pagos y cobros", ["view", "create", "void"]),
  screen(18, "finance", "Finanzas", "finance.cash", "Caja", ["view", "create", "edit"]),
  screen(19, "finance", "Finanzas", "finance.banks", "Bancos", ["view", "create", "edit"]),
  screen(20, "finance", "Finanzas", "finance.statements", "Estados de cuenta", V),

  screen(21, "documents", "Documentos", "documents.files", "Archivos", ["view", "create", "void"]),

  screen(22, "maintenance", "Maestro", "maintenance.companies", "Empresas", CRUD),
  screen(23, "maintenance", "Maestro", "maintenance.branches", "Sucursales", CRUD),
  screen(24, "maintenance", "Maestro", "maintenance.warehouses", "Almacenes", CRUD),
  screen(25, "maintenance", "Maestro", "maintenance.products", "Productos", CRUD),
  screen(26, "maintenance", "Maestro", "maintenance.categories", "Categorías", CRUD),
  screen(27, "maintenance", "Maestro", "maintenance.brands", "Marcas", CRUD),
  screen(28, "maintenance", "Maestro", "maintenance.units", "Unidades de medida", CRUD),
  screen(29, "maintenance", "Maestro", "maintenance.unit-conversions", "Conversiones de unidades", CRUD),
  screen(30, "maintenance", "Maestro", "maintenance.customers", "Clientes", CRUD),
  screen(31, "maintenance", "Maestro", "maintenance.suppliers", "Proveedores", CRUD),
  screen(32, "maintenance", "Maestro", "maintenance.transporters", "Transportistas", CRUD),
  screen(33, "maintenance", "Maestro", "maintenance.sellers", "Vendedores", CRUD),
  screen(34, "maintenance", "Maestro", "maintenance.zones", "Zonas", CRUD),
  screen(35, "maintenance", "Maestro", "maintenance.currencies", "Monedas y tipos de cambio", CRUD),
  screen(36, "maintenance", "Maestro", "maintenance.taxes", "Impuestos", CRUD),
  screen(37, "maintenance", "Maestro", "maintenance.payment-methods", "Formas de pago", CRUD),
  screen(38, "maintenance", "Maestro", "maintenance.price-lists", "Listas de precios", CRUD),

  screen(39, "administration", "Administración", "administration.users", "Usuarios", ["view", "create", "edit"]),
  screen(40, "administration", "Administración", "administration.roles", "Roles", CRUD),
  screen(41, "administration", "Administración", "administration.audit", "Auditoría", V),
  screen(42, "administration", "Administración", "administration.settings", "Parámetros", ["view", "edit"]),

  screen(43, "reports", "Reportes", "reports.operational", "Operativos", V),
  screen(44, "reports", "Reportes", "reports.analytics", "Analíticos", V),
]

export const permissionHandlers = createCrudHandlers<PermissionScreen>({
  resource: "permissions",
  seed: permissionSeed,
  searchFields: ["label", "code"],
  filterFields: ["module"],
})