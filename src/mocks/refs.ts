/**
 * Datos semilla de Mantenimiento que los mocks de Ventas, Compras y Finanzas necesitan para
 * hablar de los mismos registros (nombres, RUC, precios, plazo de crédito...). Solo los mocks
 * los usan: el código de la app consulta a cada módulo por su index (regla 0.5).
 * Si cambian los seeds de Mantenimiento, se corrigen también aquí.
 */
const id = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`

export const customerRef = (n: number) => id("8000", n)
export const supplierRef = (n: number) => id("8001", n)
export const productRef = (n: number) => id("8004", n)
export const warehouseRef = (n: number) => id("8003", n)
export const userRef = (n: number) => id("8010", n)

export interface CustomerSeed {
  n: number
  document_type: "DNI" | "RUC" | "CE"
  document_number: string
  name: string
  credit_limit: string
  active: boolean
}

export const CUSTOMERS: CustomerSeed[] = [
  { n: 1, document_type: "RUC", document_number: "20100000001", name: "Comercial Andina S.A.C.", credit_limit: "5000.00", active: true },
  { n: 2, document_type: "RUC", document_number: "20100000002", name: "Distribuidora Pacífico S.R.L.", credit_limit: "12000.00", active: true },
  { n: 3, document_type: "DNI", document_number: "70000003", name: "María Quispe Huamán", credit_limit: "800.00", active: true },
  { n: 4, document_type: "DNI", document_number: "70000004", name: "Luis Ramírez Torres", credit_limit: "1500.50", active: true },
  { n: 5, document_type: "RUC", document_number: "20100000005", name: "Ferretería El Constructor E.I.R.L.", credit_limit: "3000.00", active: false },
  { n: 6, document_type: "DNI", document_number: "70000006", name: "Carmen Flores Vega", credit_limit: "0.00", active: true },
  { n: 7, document_type: "CE", document_number: "001234567", name: "John Smith", credit_limit: "2500.00", active: true },
  { n: 8, document_type: "RUC", document_number: "20100000008", name: "Agroexport del Sur S.A.", credit_limit: "20000.00", active: true },
  { n: 10, document_type: "RUC", document_number: "20100000010", name: "Textiles Inca S.A.C.", credit_limit: "8000.00", active: true },
  { n: 11, document_type: "DNI", document_number: "70000011", name: "Ana Torres Salazar", credit_limit: "1200.00", active: true },
]

export interface SupplierSeed {
  n: number
  document_type: "DNI" | "RUC" | "CE"
  document_number: string
  name: string
  credit_days: number
}

export const SUPPLIERS: SupplierSeed[] = [
  { n: 1, document_type: "RUC", document_number: "20500000001", name: "Aceros y Perfiles del Perú S.A.C.", credit_days: 30 },
  { n: 2, document_type: "RUC", document_number: "20500000002", name: "Importaciones Logísticas Globales S.R.L.", credit_days: 60 },
  { n: 3, document_type: "DNI", document_number: "10000003", name: "Carlos Eduardo Mendoza", credit_days: 0 },
  { n: 4, document_type: "DNI", document_number: "10000004", name: "Sofía Elena Benítez", credit_days: 15 },
  { n: 8, document_type: "RUC", document_number: "20500000008", name: "Proveedora de Insumos del Norte S.A.", credit_days: 60 },
  { n: 10, document_type: "RUC", document_number: "20500000010", name: "Comercializadora Química S.A.C.", credit_days: 30 },
]

export interface ProductSeed {
  n: number
  sku: string
  name: string
  unit: string
  sale_price: string
  cost_price: string
  stock_total: number
  min_stock: number
}

export const PRODUCTS: ProductSeed[] = [
  { n: 1, sku: "PROD-001", name: "Martillo de Peña 16oz", unit: "UND", sale_price: "45.50", cost_price: "30.00", stock_total: 25, min_stock: 10 },
  { n: 2, sku: "PROD-002", name: "Juego de Destornilladores 6pcs", unit: "UND", sale_price: "32.00", cost_price: "21.50", stock_total: 40, min_stock: 15 },
  { n: 3, sku: "PROD-003", name: "Cemento Portland Tipo I 42.5kg", unit: "BOLSA", sale_price: "28.90", cost_price: "24.00", stock_total: 150, min_stock: 60 },
  { n: 4, sku: "PROD-004", name: "Ladrillo Klinker 18 Huecos", unit: "UND", sale_price: "1.80", cost_price: "1.20", stock_total: 1200, min_stock: 300 },
  { n: 5, sku: "PROD-005", name: "Casco de Seguridad Dielectrico Blanco", unit: "UND", sale_price: "25.00", cost_price: "15.00", stock_total: 80, min_stock: 20 },
  { n: 6, sku: "PROD-006", name: "Guantes de Nitrilo Industrial L", unit: "PAQ", sale_price: "12.50", cost_price: "8.00", stock_total: 200, min_stock: 50 },
  { n: 7, sku: "PROD-007", name: "Pintura Látex Super Lavable 4L", unit: "UND", sale_price: "68.00", cost_price: "52.00", stock_total: 35, min_stock: 40 },
  { n: 8, sku: "PROD-008", name: "Tubo PVC Presión 1/2 pulg x 5m", unit: "UND", sale_price: "14.20", cost_price: "9.80", stock_total: 90, min_stock: 25 },
  { n: 9, sku: "PROD-009", name: "Cable Mellizo 2x16 AWG 100m", unit: "UND", sale_price: "115.00", cost_price: "118.00", stock_total: 15, min_stock: 20 },
  { n: 10, sku: "PROD-010", name: "Candado de Latón 50mm Anticorte", unit: "UND", sale_price: "38.00", cost_price: "22.00", stock_total: 50, min_stock: 10 },
  { n: 11, sku: "PROD-011", name: "Reflector LED Industrial 100W", unit: "UND", sale_price: "89.90", cost_price: "60.00", stock_total: 20, min_stock: 10 },
]

export const findCustomer = (customerId: string) => CUSTOMERS.find((c) => customerRef(c.n) === customerId)
export const findSupplier = (supplierId: string) => SUPPLIERS.find((s) => supplierRef(s.n) === supplierId)
export const findProduct = (productId: string) => PRODUCTS.find((p) => productRef(p.n) === productId)

/** Nombre para mostrar; si el registro no está en los seeds (creado en la sesión), se indica así */
export const customerName = (customerId: string) => findCustomer(customerId)?.name ?? "Cliente registrado en esta sesión"
export const supplierName = (supplierId: string) => findSupplier(supplierId)?.name ?? "Proveedor registrado en esta sesión"
export const productName = (productId: string) => findProduct(productId)?.name ?? "Producto registrado en esta sesión"

/**
 * Usuario de la sesión según el token simulado ("mock-access-token-<id>", ver auth/mocks.ts).
 * Lo usan las reglas que dependen de quién hace la petición (ej. no aprobar lo propio).
 */
export function sessionUserId(request: Request): string {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? ""
  return token.startsWith("mock-access-token-") ? token.slice("mock-access-token-".length) : ""
}

export const USER_NAMES: Record<string, string> = {
  [userRef(1)]: "Gabriel Romero",
  [userRef(8)]: "Pedro Campos Rivas",
  [userRef(9)]: "Silvia Ortega Luna",
  [userRef(10)]: "Alan Reyes Cabrera",
}
