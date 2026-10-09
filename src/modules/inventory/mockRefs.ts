/**
 * Copia los datos semilla de Mantenimiento (productos 8004, almacenes 8003, categorías 8002) para que
 * los mocks de Inventario hablen de los mismos registros. Si Gabo cambia sus seeds, se corrige AQUÍ.
 * (Se copian los valores, no se importa: un módulo no importa archivos internos de otro.)
 */
export const productRef = (n: number) => `00000000-0000-4000-8004-${String(n).padStart(12, "0")}`
export const warehouseRef = (n: number) => `00000000-0000-4000-8003-${String(n).padStart(12, "0")}`
export const categoryRef = (n: number) => `00000000-0000-4000-8002-${String(n).padStart(12, "0")}`

/** Copia de los productos de Mantenimiento: SKU, unidad y stock mínimo iguales a su ficha */
export const PRODUCTS = {
  hammer: { n: 1, sku: "PROD-001", name: "Martillo de Peña 16oz", category: 1, categoryName: "Herramientas Manuales", minStock: 10, unit: "UND" },
  screwdrivers: { n: 2, sku: "PROD-002", name: "Juego de Destornilladores 6pcs", category: 1, categoryName: "Herramientas Manuales", minStock: 15, unit: "UND" },
  cement: { n: 3, sku: "PROD-003", name: "Cemento Portland Tipo I 42.5kg", category: 2, categoryName: "Materiales de Construcción", minStock: 60, unit: "BOLSA" },
  brick: { n: 4, sku: "PROD-004", name: "Ladrillo Klinker 18 Huecos", category: 2, categoryName: "Materiales de Construcción", minStock: 300, unit: "UND" },
  helmet: { n: 5, sku: "PROD-005", name: "Casco de Seguridad Dielectrico Blanco", category: 3, categoryName: "Equipos de Protección Personal", minStock: 20, unit: "UND" },
  gloves: { n: 6, sku: "PROD-006", name: "Guantes de Nitrilo Industrial L", category: 3, categoryName: "Equipos de Protección Personal", minStock: 50, unit: "PAQ" },
  paint: { n: 7, sku: "PROD-007", name: "Pintura Látex Super Lavable 4L", category: 4, categoryName: "Pinturas y Recubrimientos", minStock: 40, unit: "UND" },
  pvc: { n: 8, sku: "PROD-008", name: "Tubo PVC Presión 1/2 pulg x 5m", category: 5, categoryName: "Tuberías y Conexiones", minStock: 25, unit: "UND" },
  cable: { n: 9, sku: "PROD-009", name: "Cable Mellizo 2x16 AWG 100m", category: 6, categoryName: "Cables y Electricidad", minStock: 20, unit: "UND" },
  padlock: { n: 10, sku: "PROD-010", name: "Candado de Latón 50mm Anticorte", category: 7, categoryName: "Cerrajería y Bisagras", minStock: 10, unit: "UND" },
  led: { n: 11, sku: "PROD-011", name: "Reflector LED Industrial 100W", category: 8, categoryName: "Iluminación Industrial", minStock: 10, unit: "UND" },
  silicone: { n: 12, sku: "PROD-012", name: "Silicona Multiuso Transparente 300ml", category: 9, categoryName: "Adhesivos y Selladores", minStock: 5, unit: "UND" },
}

export const WAREHOUSES = {
  central: { n: 1, name: "Almacén Central Principal" },
  rawMaterial: { n: 2, name: "Almacén de Materia Prima" },
  finished: { n: 3, name: "Almacén de Productos Terminados" },
  sanJuan: { n: 4, name: "Depósito San Juan de Lurigancho" },
  south: { n: 5, name: "Almacén Sur Villa El Salvador" },
  north: { n: 6, name: "Almacén Norte Los Olivos" },
  temporaryCallao: { n: 7, name: "Depósito Temporal Callao" },
  tools: { n: 8, name: "Almacén Repuestos y Herramientas" },
  maintenanceInactive: { n: 9, name: "Depósito Mantenimiento Inactivo" },
  ate: { n: 10, name: "Almacén Auxiliar Ate" },
  transitoryArequipa: { n: 11, name: "Almacén Transitorio Arequipa" },
  oldChorrillos: { n: 12, name: "Depósito Antiguo Chorrillos" },
}