import { createCrudHandlers } from "@/mocks/utils/crud"
import { PRODUCTS, WAREHOUSES, categoryRef, productRef, warehouseRef } from "../mockRefs"
import type { StockRow, StockStatus } from "./schema"

/** UUID fijos con el prefijo de stock (8030) */
const uuid = (n: number) => `00000000-0000-4000-8030-${String(n).padStart(12, "0")}`

type ProductSeed = (typeof PRODUCTS)[keyof typeof PRODUCTS]
type WarehouseSeed = (typeof WAREHOUSES)[keyof typeof WAREHOUSES]

/** Solo para sembrar datos coherentes: en la app real el estado lo calcula el backend */
function seedStatus(quantity: number, min: number): StockStatus {
  if (quantity === 0) return "out"
  return quantity <= min ? "low" : "normal"
}

const row = (
  n: number,
  product: ProductSeed,
  warehouse: WarehouseSeed,
  quantity: number,
): StockRow => ({
  id: uuid(n),
  product_id: productRef(product.n),
  product_code: product.code,
  product_name: product.name,
  category_id: categoryRef(product.category),
  category_name: product.categoryName,
  warehouse_id: warehouseRef(warehouse.n),
  warehouse_name: warehouse.name,
  unit: "UND",
  quantity,
  min_stock: product.minStock,
  status: seedStatus(quantity, product.minStock),
})

// 18 registros (2 páginas con size=10). Por cada producto, la suma de sus almacenes
// coincide con el `stock` de su ficha en Mantenimiento.
const seed: StockRow[] = [
  row(1, PRODUCTS.hammer, WAREHOUSES.central, 15),
  row(2, PRODUCTS.hammer, WAREHOUSES.finished, 10),
  row(3, PRODUCTS.screwdrivers, WAREHOUSES.central, 40),
  row(4, PRODUCTS.cement, WAREHOUSES.rawMaterial, 100),
  row(5, PRODUCTS.cement, WAREHOUSES.central, 50),
  row(6, PRODUCTS.brick, WAREHOUSES.rawMaterial, 800),
  row(7, PRODUCTS.brick, WAREHOUSES.south, 400),
  row(8, PRODUCTS.helmet, WAREHOUSES.central, 80),
  row(9, PRODUCTS.gloves, WAREHOUSES.central, 120),
  row(10, PRODUCTS.gloves, WAREHOUSES.north, 80),
  row(11, PRODUCTS.paint, WAREHOUSES.finished, 35),
  row(12, PRODUCTS.pvc, WAREHOUSES.rawMaterial, 60),
  row(13, PRODUCTS.pvc, WAREHOUSES.south, 30),
  row(14, PRODUCTS.cable, WAREHOUSES.central, 15),
  row(15, PRODUCTS.padlock, WAREHOUSES.tools, 50),
  row(16, PRODUCTS.led, WAREHOUSES.sanJuan, 12),
  row(17, PRODUCTS.led, WAREHOUSES.ate, 8),
  row(18, PRODUCTS.silicone, WAREHOUSES.central, 0),
]

export const stockHandlers = createCrudHandlers<StockRow>({
  resource: "inventory/stock",
  seed,
  searchFields: ["product_name", "product_code"],
  filterFields: ["status", "warehouse_id", "category_id", "product_id"],
})