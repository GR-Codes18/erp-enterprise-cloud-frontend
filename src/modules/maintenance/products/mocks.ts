import { createCrudHandlers } from "@/mocks/createCrudHandlers"
import type { Product, ProductStatus } from "./schema"

/** UUIDs de productos con prefijo 8004 */
const uuid = (n: number) => `00000000-0000-4000-8004-${String(n).padStart(12, "0")}`
/** UUIDs de categorías referenciados (prefijo 8002 de Categorías) */
const catUuid = (n: number) => `00000000-0000-4000-8002-${String(n).padStart(12, "0")}`

const CATEGORIES_MAP: Record<string, string> = {
  [catUuid(1)]: "Herramientas Manuales",
  [catUuid(2)]: "Materiales de Construcción",
  [catUuid(3)]: "Equipos de Protección Personal",
  [catUuid(4)]: "Pinturas y Recubrimientos",
  [catUuid(5)]: "Tuberías y Conexiones",
  [catUuid(6)]: "Cables y Electricidad",
  [catUuid(7)]: "Cerrajería y Bisagras",
  [catUuid(8)]: "Iluminación Industrial",
  [catUuid(9)]: "Adhesivos y Selladores",
}

const product = (
  n: number,
  code: string,
  name: string,
  catNum: number,
  unitPrice: number,
  stock: number,
  status: ProductStatus
): Product => {
  const category_id = catUuid(catNum)
  return {
    id: uuid(n),
    code,
    name,
    category_id,
    category_name: CATEGORIES_MAP[category_id] || "General",
    unit_price: unitPrice,
    stock,
    status,
  }
}

// 12 productos semilla
const products: Product[] = [
  product(1, "PROD-001", "Martillo de Peña 16oz", 1, 45.5, 25, "active"),
  product(2, "PROD-002", "Juego de Destornilladores 6pcs", 1, 32.0, 40, "active"),
  product(3, "PROD-003", "Cemento Portland Tipo I 42.5kg", 2, 28.9, 150, "active"),
  product(4, "PROD-004", "Ladrillo Klinker 18 Huecos", 2, 1.8, 1200, "active"),
  product(5, "PROD-005", "Casco de Seguridad Dielectrico Blanco", 3, 25.0, 80, "active"),
  product(6, "PROD-006", "Guantes de Nitrilo Industrial L", 3, 12.5, 200, "active"),
  product(7, "PROD-007", "Pintura Látex Super Lavable 4L", 4, 68.0, 35, "active"),
  product(8, "PROD-008", "Tubo PVC Presión 1/2 pulg x 5m", 5, 14.2, 90, "active"),
  product(9, "PROD-009", "Cable Mellizo 2x16 AWG 100m", 6, 115.0, 15, "active"),
  product(10, "PROD-010", "Candado de Latón 50mm Anticorte", 7, 38.0, 50, "active"),
  product(11, "PROD-011", "Reflector LED Industrial 100W", 8, 89.9, 20, "active"),
  product(12, "PROD-012", "Silicona Multiuso Transparente 300ml", 9, 16.5, 0, "inactive"),
]

/** IDs semilla simularán estar "en uso" en ventas/compras para probar el error 409 */
const IN_USE_IDS = [uuid(1), uuid(2)]

export const productHandlers = createCrudHandlers<Product>({
  endpoint: "*/products",
  items: products,
  searchFields: ["code", "name"],
  filterFields: ["status"],
  uniqueFields: [
    {
      field: "code",
      label: "código",
      normalize: (val: any) => String(val ?? "").trim().toUpperCase(),
    },
  ],
  immutableFields: ["code", "stock"],
  inUseIds: IN_USE_IDS,
  inUseMessage:
    "Este producto tiene movimientos y no se puede eliminar. Puedes desactivarlo para que deje de usarse en nuevas operaciones.",
  onBeforeCreate: (body: any, currentItems: Product[]) => {
    const newId = uuid(currentItems.length + 1)
    const codeNormalized = String(body.code ?? "").trim().toUpperCase()
    const categoryName = CATEGORIES_MAP[body.category_id] || "General"
    return {
      id: newId,
      code: codeNormalized,
      name: String(body.name ?? "").trim(),
      category_name: categoryName,
      stock: 0,
    }
  },
  onBeforeUpdate: (current: Product, body: any) => {
    const categoryName = CATEGORIES_MAP[body.category_id] || current.category_name || "General"
    return {
      name: String(body.name ?? "").trim(),
      category_name: categoryName,
    }
  },
})