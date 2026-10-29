import { createCrudHandlers } from "@/mocks/utils/crud"
import type { Product, ProductStatus, ProductUnit } from "./schema"

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
  sku: string,
  name: string,
  catNum: number,
  unit: ProductUnit,
  sale_price: string,
  cost_price: string,
  min_stock: number,
  stock_total: number,
  status: ProductStatus = "active",
): Product => {
  const category_id = catUuid(catNum)
  return {
    id: uuid(n),
    sku,
    name,
    category_id,
    category_name: CATEGORIES_MAP[category_id] ?? "General",
    unit,
    sale_price,
    cost_price,
    min_stock,
    stock_total,
    status,
  }
}

// 12 productos semilla. stock_total coincide con la suma de sus almacenes en los mocks de Inventario.
// El cable se vende por debajo del costo (liquidación) para ver la advertencia del formulario.
const seed: Product[] = [
  product(1, "PROD-001", "Martillo de Peña 16oz", 1, "UND", "45.50", "30.00", 10, 25),
  product(2, "PROD-002", "Juego de Destornilladores 6pcs", 1, "UND", "32.00", "21.50", 15, 40),
  product(3, "PROD-003", "Cemento Portland Tipo I 42.5kg", 2, "BOLSA", "28.90", "24.00", 60, 150),
  product(4, "PROD-004", "Ladrillo Klinker 18 Huecos", 2, "UND", "1.80", "1.20", 300, 1200),
  product(5, "PROD-005", "Casco de Seguridad Dielectrico Blanco", 3, "UND", "25.00", "15.00", 20, 80),
  product(6, "PROD-006", "Guantes de Nitrilo Industrial L", 3, "PAQ", "12.50", "8.00", 50, 200),
  product(7, "PROD-007", "Pintura Látex Super Lavable 4L", 4, "UND", "68.00", "52.00", 40, 35),
  product(8, "PROD-008", "Tubo PVC Presión 1/2 pulg x 5m", 5, "UND", "14.20", "9.80", 25, 90),
  product(9, "PROD-009", "Cable Mellizo 2x16 AWG 100m", 6, "UND", "115.00", "118.00", 20, 15),
  product(10, "PROD-010", "Candado de Latón 50mm Anticorte", 7, "UND", "38.00", "22.00", 10, 50),
  product(11, "PROD-011", "Reflector LED Industrial 100W", 8, "UND", "89.90", "60.00", 10, 20),
  product(12, "PROD-012", "Silicona Multiuso Transparente 300ml", 9, "UND", "16.50", "10.00", 5, 0, "inactive"),
]
let currentProducts = new Map(seed.map((item) => [item.id, item]))
export const isProductUnitInUse = (unit: string) =>
  [...currentProducts.values()].some((item) => item.unit === unit)

/** Productos 1 y 2 tienen movimientos: no se borran ni cambian de unidad (409) */
const WITH_MOVEMENTS = [uuid(1), uuid(2)]

export const productHandlers = createCrudHandlers<Product>({
  resource: "products",
  seed,
  onChange: (items) => {
    currentProducts = new Map(items.map((item) => [item.id, item]))
  },
  // Un registro nuevo aparece primero en el listado
  insertAt: "start",
  searchFields: ["sku", "name"],
  filterFields: ["status", "category_id"],
  uniqueFields: [
    {
      field: "sku",
      label: "SKU",
      normalize: (value) => String(value ?? "").trim().toUpperCase(),
    },
  ],
  // El stock total lo calcula el servidor: nunca se edita desde el formulario
  immutableFields: ["sku", "stock_total"],
  createdFields: { stock_total: 0 },
  isInUse: (item) => WITH_MOVEMENTS.includes(item.id),
  inUseMessage:
    "Este producto tiene movimientos y no se puede eliminar. Puedes desactivarlo para que deje de usarse en nuevas operaciones.",
  prepareCreate: (body) => {
    const categoryId = String(body.category_id ?? "")
    return {
      sku: String(body.sku ?? "").trim().toUpperCase(),
      name: String(body.name ?? "").trim(),
      category_id: categoryId,
      category_name: CATEGORIES_MAP[categoryId] ?? "General",
    }
  },
  prepareUpdate: (current, body) => {
    const categoryId = String(body.category_id ?? current.category_id)
    return {
      name: String(body.name ?? "").trim(),
      category_id: categoryId,
      category_name: CATEGORIES_MAP[categoryId] ?? current.category_name,
    }
  },
  validate: ({ action, current, next }) => {
    if (action === "update" && current && next && current.unit !== next.unit && WITH_MOVEMENTS.includes(current.id)) {
      const message = "La unidad no se puede cambiar porque el producto ya tiene movimientos"
      return { status: 409, code: "UNIT_LOCKED", message, errors: [{ field: "unit", message }] }
    }
    return undefined
  },
})
