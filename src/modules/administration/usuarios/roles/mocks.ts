import { createCrudHandlers } from "@/mocks/utils/crud"
import type { Role } from "./schema"

/** UUID fijos con el prefijo de roles (8011) */
export const roleId = (n: number) => `00000000-0000-4000-8011-${String(n).padStart(12, "0")}`

const role = (n: number, name: string, description: string, is_system = false): Role => ({
  id: roleId(n),
  name,
  description,
  permissions: [],
  is_system,
})

// Los permisos se agregan en el PR de Roles, cuando esté definido el catálogo
const seed: Role[] = [
  role(1, "Administrador", "Acceso total al sistema, configuración y auditoría.", true),
  role(2, "Gerente / Director", "Dashboard ejecutivo, finanzas, analítica y aprobaciones."),
  role(3, "Operador Comercial / Ventas", "Módulo comercial y consulta de stock."),
  role(4, "Encargado de Compras", "Módulo de compras y catálogo de productos."),
  role(5, "Almacenero / Logística", "Inventario y recepción de mercadería."),
  role(6, "Personal de Finanzas", "Cuentas por cobrar y pagar, caja y bancos."),
]

export const roleHandlers = createCrudHandlers<Role>({
  resource: "roles",
  seed,
  searchFields: ["name", "description"],
  filterFields: [],
})