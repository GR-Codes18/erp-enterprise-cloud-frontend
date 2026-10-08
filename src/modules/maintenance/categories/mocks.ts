import { createCrudHandlers } from "@/mocks/utils/crud"
import type { Category, CategoryStatus } from "./schema"

/** UUID fijos y legibles (válidos v4): 00000000-0000-4000-8002-000000000001, ...002, etc. */
const uuid = (n: number) => `00000000-0000-4000-8002-${String(n).padStart(12, "0")}`

const category = (n: number, name: string, status: CategoryStatus): Category => ({
  id: uuid(n),
  name,
  status,
})

// 12 registros para ver paginación con size=10
const seed: Category[] = [
  category(1, "Herramientas Manuales", "active"),
  category(2, "Materiales de Construcción", "active"),
  category(3, "Equipos de Protección Personal", "active"),
  category(4, "Pinturas y Recubrimientos", "active"),
  category(5, "Tuberías y Conexiones", "active"),
  category(6, "Cables y Electricidad", "active"),
  category(7, "Cerrajería y Bisagras", "active"),
  category(8, "Iluminación Industrial", "active"),
  category(9, "Adhesivos y Selladores", "inactive"),
  category(10, "Herramientas Eléctricas", "active"),
  category(11, "Seguridad Vial", "active"),
  category(12, "Limpieza Industrial", "inactive"),
]

export const categoryHandlers = createCrudHandlers<Category>({
  resource: "categories",
  seed,
  searchFields: ["name"],
  filterFields: ["status"],
})