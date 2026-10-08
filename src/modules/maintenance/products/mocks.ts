import { http, HttpResponse } from "msw"
import type { Product, ProductCreateInput, ProductStatus, ProductUpdateInput } from "./schema"

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

export const productHandlers = [
  // LISTAR
  http.get("/products", ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get("search")?.toLowerCase().trim() || ""
    const status = url.searchParams.get("status")
    const page = Number(url.searchParams.get("page") || "1")
    const size = Number(url.searchParams.get("size") || "10")

    let filtered = products

    if (search) {
      filtered = filtered.filter(
        (p) => p.code.toLowerCase().includes(search) || p.name.toLowerCase().includes(search)
      )
    }

    if (status) {
      filtered = filtered.filter((p) => p.status === status)
    }

    const total = filtered.length
    const pages = Math.ceil(total / size) || 1
    const start = (page - 1) * size
    const items = filtered.slice(start, start + size)

    return HttpResponse.json({ items, total, page, size, pages })
  }),

  // CREAR (Nace con stock 0; verifica duplicidad de código)
  http.post("/products", async ({ request }) => {
    const body = (await request.json()) as ProductCreateInput
    const codeNormalized = body.code.trim().toUpperCase()

    const exists = products.some((p) => p.code.toUpperCase() === codeNormalized)
    if (exists) {
      return HttpResponse.json(
        {
          message: "Ya existe un producto con este código",
          fieldErrors: [{ field: "code", message: "Ya existe un producto con este código" }],
        },
        { status: 409 }
      )
    }

    const newId = `00000000-0000-4000-8004-${String(products.length + 1).padStart(12, "0")}`
    const categoryName = CATEGORIES_MAP[body.category_id] || "General"

    const newProduct: Product = {
      id: newId,
      code: codeNormalized,
      name: body.name.trim(),
      category_id: body.category_id,
      category_name: categoryName,
      unit_price: body.unit_price,
      stock: 0,
      status: body.status,
    }

    products.unshift(newProduct)
    return HttpResponse.json(newProduct, { status: 201 })
  }),

  // ACTUALIZAR (PUT - Inmutable: conserva el código original y el stock)
  http.put("/products/:id", async ({ request, params }) => {
    const { id } = params
    const body = (await request.json()) as ProductUpdateInput

    const index = products.findIndex((p) => p.id === id)
    if (index === -1) {
      return HttpResponse.json({ message: "Producto no encontrado" }, { status: 404 })
    }

    const current = products[index]
    const categoryName = CATEGORIES_MAP[body.category_id] || current.category_name || "General"

    const updated: Product = {
      ...current,
      name: body.name.trim(),
      category_id: body.category_id,
      category_name: categoryName,
      unit_price: body.unit_price,
      status: body.status,
    }

    products[index] = updated
    return HttpResponse.json(updated)
  }),

  // ACTUALIZACIÓN PARCIAL (PATCH - para desactivar/activar)
  http.patch("/products/:id", async ({ request, params }) => {
    const { id } = params
    const body = (await request.json()) as Partial<Product>

    const index = products.findIndex((p) => p.id === id)
    if (index === -1) {
      return HttpResponse.json({ message: "Producto no encontrado" }, { status: 404 })
    }

    products[index] = { ...products[index], ...body }
    return HttpResponse.json(products[index])
  }),

  // ELIMINAR (DELETE - 409 si el producto está en uso)
  http.delete("/products/:id", ({ params }) => {
    const { id } = params

    if (IN_USE_IDS.includes(String(id))) {
      return HttpResponse.json(
        {
          message:
            "Este producto tiene movimientos y no se puede eliminar. Puedes desactivarlo para que deje de usarse en nuevas operaciones.",
        },
        { status: 409 }
      )
    }

    const index = products.findIndex((p) => p.id === id)
    if (index === -1) {
      return HttpResponse.json({ message: "Producto no encontrado" }, { status: 404 })
    }

    products.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]