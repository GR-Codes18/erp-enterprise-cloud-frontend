import { createCrudHandlers } from "@/mocks/utils/crud"
import { PRODUCTS, WAREHOUSES, productRef, warehouseRef } from "../mockRefs"
import type { KardexRow, KardexType } from "./schema"

/** UUID fijos con el prefijo de Kardex (8031) */
const uuid = (n: number) => `00000000-0000-4000-8031-${String(n).padStart(12, "0")}`

type ProductSeed = (typeof PRODUCTS)[keyof typeof PRODUCTS]
type WarehouseSeed = (typeof WAREHOUSES)[keyof typeof WAREHOUSES]

/** El saldo se escribe a mano en cada fila porque en la app real lo calcula el backend */
const move = (
  n: number,
  product: ProductSeed,
  warehouse: WarehouseSeed,
  day: string,
  type: KardexType,
  reference: string,
  quantityIn: number,
  quantityOut: number,
  balance: number,
): KardexRow => ({
  id: uuid(n),
  product_id: productRef(product.n),
  warehouse_id: warehouseRef(warehouse.n),
  warehouse_name: warehouse.name,
  occurred_at: `${day}T15:00:00Z`,
  type,
  reference,
  quantity_in: quantityIn,
  quantity_out: quantityOut,
  balance,
})

const { cement, hammer, cable, paint, silicone } = PRODUCTS
const { central, rawMaterial, finished } = WAREHOUSES

// El saldo final de cada producto y almacén coincide con las existencias del seed de Stock.
// El cemento tiene 12 movimientos para poder ver la paginación con size=10.
const seed: KardexRow[] = [
  // Cemento
  move(1, cement, rawMaterial, "2026-09-01", "purchase", "OC-2026-001", 300, 0, 300),
  move(2, cement, rawMaterial, "2026-09-03", "sale", "VT-00001", 0, 20, 280),
  move(3, cement, rawMaterial, "2026-09-06", "sale", "VT-00002", 0, 25, 255),
  move(4, cement, rawMaterial, "2026-09-09", "sale", "VT-00004", 0, 15, 240),
  move(5, cement, rawMaterial, "2026-09-12", "sale", "VT-00005", 0, 30, 210),
  move(6, cement, rawMaterial, "2026-09-15", "return", "DV-0002", 5, 0, 215),
  move(7, cement, rawMaterial, "2026-09-18", "sale", "VT-00007", 0, 35, 180),
  move(8, cement, rawMaterial, "2026-09-22", "sale", "VT-00008", 0, 20, 160),
  move(9, cement, rawMaterial, "2026-09-28", "sale", "VT-00011", 0, 20, 140),
  move(10, cement, rawMaterial, "2026-10-02", "transfer_out", "TR-1201", 0, 40, 100),
  move(11, cement, central, "2026-10-02", "transfer_in", "TR-1201", 40, 0, 40),
  move(12, cement, central, "2026-10-05", "adjustment", "AJ-0301", 10, 0, 50),
  // Martillo
  move(13, hammer, central, "2026-09-18", "purchase", "OC-2026-002", 30, 0, 30),
  move(14, hammer, central, "2026-09-25", "sale", "VT-00009", 0, 5, 25),
  move(15, hammer, central, "2026-10-01", "transfer_out", "TR-1202", 0, 10, 15),
  move(16, hammer, finished, "2026-10-01", "transfer_in", "TR-1202", 10, 0, 10),
  // Cable
  move(17, cable, central, "2026-09-15", "purchase", "OC-2026-003", 40, 0, 40),
  move(18, cable, central, "2026-09-30", "sale", "VT-00013", 0, 20, 20),
  move(19, cable, central, "2026-10-04", "adjustment", "AJ-0302", 0, 5, 15),
  // Pintura
  move(20, paint, finished, "2026-09-22", "purchase", "OC-2026-004", 50, 0, 50),
  move(21, paint, finished, "2026-09-29", "sale", "VT-00012", 0, 18, 32),
  move(22, paint, finished, "2026-10-03", "return", "DV-0001", 3, 0, 35),
  // Silicona (queda sin stock)
  move(23, silicone, central, "2026-09-10", "purchase", "OC-2026-005", 20, 0, 20),
  move(24, silicone, central, "2026-09-20", "sale", "VT-00006", 0, 20, 0),
]

export const kardexHandlers = createCrudHandlers<KardexRow>({
  resource: "inventory/kardex",
  seed,
  searchFields: ["reference"],
  filterFields: ["product_id", "warehouse_id", "type"],
  dateField: "occurred_at",
})