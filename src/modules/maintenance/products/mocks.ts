import { createCrudHandlers } from "@/mocks/utils/crud"
import type { Product, ProductStatus } from "./schema"

/** UUIDs de productos con prefijo 8004 */
const uuid = (n: number) => `00000000-0000-4000-8004-${String(n).padStart(12, "0")}`

/** UUIDs de categorías referenciados (prefijo 8002 de Categorías) */
const catUuid = (n: number) => `00000000-0000-4000-8002-${String(n).padStart(12, "0")}`

const product = (
  n: number,
  code: string,
  name: string,
  catNum: number,
  categoryName: string,
  unitPrice: number,
  stock: number,
  status: ProductStatus
): Product => ({
  id: uuid(n),
  code,
  name,
  category_id: catUuid(catNum),
  category_name: categoryName,
  unit_price: unitPrice,
  stock,
  status,
})

// 12 productos semilla para validar paginación (size=10)
const seed: Product[] = [
  product(1, "PROD-001", "Martillo de Peña 16oz", 1, "Herramientas Manuales", 45.5, 25, "active"),
  product(2, "PROD-002", "Juego de Destornilladores 6pcs", 1, "Herramientas Manuales", 32.0, 40, "active"),
  product(3, "PROD-003", "Cemento Portland Tipo I 42.5kg", 2, "Materiales de Construcción", 28.9, 150, "active"),
  product(4, "PROD-004", "Ladrillo Klinker 18 Huecos", 2, "Materiales de Construcción", 1.8, 1200, "active"),
  product(5, "PROD-005", "Casco de Seguridad Dielectrico Blanco", 3, "Equipos de Protección Personal", 25.0, 80, "active"),
  product(6, "PROD-006", "Guantes de Nitrilo Industrial L", 3, "Equipos de Protección Personal", 12.5, 200, "active"),
  product(7, "PROD-007", "Pintura Látex Super Lavable 4L", 4, "Pinturas y Recubrimientos", 68.0, 35, "active"),
  product(8, "PROD-008", "Tubo PVC Presión 1/2 pulg x 5m", 5, "Tuberías y Conexiones", 14.2, 90, "active"),
  product(9, "PROD-009", "Cable Mellizo 2x16 AWG 100m", 6, "Cables y Electricidad", 115.0, 15, "active"),
  product(10, "PROD-010", "Candado de Latón 50mm Anticorte", 7, "Cerrajería y Bisagras", 38.0, 50, "active"),
  product(11, "PROD-011", "Reflector LED Industrial 100W", 8, "Iluminación Industrial", 89.9, 20, "active"),
  product(12, "PROD-012", "Silicona Multiuso Transparente 300ml", 9, "Adhesivos y Selladores", 16.5, 0, "inactive"),
]

export const productHandlers = createCrudHandlers<Product>({
  resource: "products",
  seed,
  searchFields: ["code", "name"],
  filterFields: ["status", "category_id"],
})