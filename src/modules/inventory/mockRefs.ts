/**
 * Copia los datos semilla de Mantenimiento (productos 8004, almacenes 8003, categorías 8002) para que
 * los mocks de Inventario hablen de los mismos registros. Si Gabo cambia sus seeds, se corrige AQUÍ.
 * (Se copian los valores, no se importa: un módulo no importa archivos internos de otro.)
 */
export const productRef = (n: number) => `00000000-0000-4000-8004-${String(n).padStart(12, "0")}`
export const warehouseRef = (n: number) => `00000000-0000-4000-8003-${String(n).padStart(12, "0")}`
export const categoryRef = (n: number) => `00000000-0000-4000-8002-${String(n).padStart(12, "0")}`

/** El stock mínimo no existe aún en los productos de Mantenimiento: lo define el backend de Inventario */
export const PRODUCTS = {
  hammer: { n: 1, code: "PROD-001", name: "Martillo de Peña 16oz", category: 1, categoryName: "Herramientas Manuales", minStock: 10 },
  screwdrivers: { n: 2, code: "PROD-002", name: "Juego de Destornilladores 6pcs", category: 1, categoryName: "Herramientas Manuales", minStock: 15 },
  cement: { n: 3, code: "PROD-003", name: "Cemento Portland Tipo I 42.5kg", category: 2, categoryName: "Materiales de Construcción", minStock: 60 },
  brick: { n: 4, code: "PROD-004", name: "Ladrillo Klinker 18 Huecos", category: 2, categoryName: "Materiales de Construcción", minStock: 300 },
  helmet: { n: 5, code: "PROD-005", name: "Casco de Seguridad Dielectrico Blanco", category: 3, categoryName: "Equipos de Protección Personal", minStock: 20 },
  gloves: { n: 6, code: "PROD-006", name: "Guantes de Nitrilo Industrial L", category: 3, categoryName: "Equipos de Protección Personal", minStock: 50 },
  paint: { n: 7, code: "PROD-007", name: "Pintura Látex Super Lavable 4L", category: 4, categoryName: "Pinturas y Recubrimientos", minStock: 40 },
  pvc: { n: 8, code: "PROD-008", name: "Tubo PVC Presión 1/2 pulg x 5m", category: 5, categoryName: "Tuberías y Conexiones", minStock: 25 },
  cable: { n: 9, code: "PROD-009", name: "Cable Mellizo 2x16 AWG 100m", category: 6, categoryName: "Cables y Electricidad", minStock: 20 },
  padlock: { n: 10, code: "PROD-010", name: "Candado de Latón 50mm Anticorte", category: 7, categoryName: "Cerrajería y Bisagras", minStock: 10 },
  led: { n: 11, code: "PROD-011", name: "Reflector LED Industrial 100W", category: 8, categoryName: "Iluminación Industrial", minStock: 10 },
  silicone: { n: 12, code: "PROD-012", name: "Silicona Multiuso Transparente 300ml", category: 9, categoryName: "Adhesivos y Selladores", minStock: 5 },
}

export const WAREHOUSES = {
  central: { n: 1, name: "Almacén Central Principal" },
  rawMaterial: { n: 2, name: "Almacén de Materia Prima" },
  finished: { n: 3, name: "Almacén de Productos Terminados" },
  sanJuan: { n: 4, name: "Depósito San Juan de Lurigancho" },
  south: { n: 5, name: "Almacén Sur Villa El Salvador" },
  north: { n: 6, name: "Almacén Norte Los Olivos" },
  tools: { n: 8, name: "Almacén Repuestos y Herramientas" },
  ate: { n: 10, name: "Almacén Auxiliar Ate" },
}