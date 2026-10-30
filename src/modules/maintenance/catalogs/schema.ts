import { z } from "zod"

export const MASTER_CATALOG_RESOURCES = [
  "companies",
  "branches",
  "brands",
  "units",
  "unit-conversions",
  "transporters",
  "sellers",
  "zones",
  "currencies",
  "taxes",
  "payment-methods",
  "price-lists",
] as const

export type MasterCatalogResource = (typeof MASTER_CATALOG_RESOURCES)[number]

export const MASTER_CATALOG_LABELS: Record<MasterCatalogResource, { title: string; singular: string; description: string }> = {
  companies: { title: "Empresas", singular: "empresa", description: "Administra las empresas y sus datos base." },
  branches: { title: "Sucursales", singular: "sucursal", description: "Controla sedes, empresas y ubicaciones operativas." },
  brands: { title: "Marcas", singular: "marca", description: "Mantén las marcas asociadas al catálogo de productos." },
  units: { title: "Unidades de medida", singular: "unidad", description: "Define unidades y abreviaturas usadas por productos e inventario." },
  "unit-conversions": { title: "Conversiones de unidades", singular: "conversión", description: "Registra equivalencias entre unidades para cantidades de inventario." },
  transporters: { title: "Transportistas", singular: "transportista", description: "Gestiona empresas, contactos y rutas de transporte." },
  sellers: { title: "Vendedores", singular: "vendedor", description: "Mantén vendedores, comisiones y zonas asignadas." },
  zones: { title: "Zonas", singular: "zona", description: "Organiza la cobertura comercial de vendedores." },
  currencies: { title: "Monedas y tipos de cambio", singular: "moneda", description: "Configura divisas activas y sus tipos de cambio." },
  taxes: { title: "Impuestos", singular: "impuesto", description: "Administra tributos aplicables a compras y ventas." },
  "payment-methods": { title: "Formas de pago", singular: "forma de pago", description: "Configura medios y condiciones consumidos por las operaciones." },
  "price-lists": { title: "Listas de precios", singular: "lista de precios", description: "Administra listas de precios y su vigencia." },
}

export const masterCatalogInputSchema = z.object({
  code: z.string().trim().min(2, "Ingresa un código").max(40, "Máximo 40 caracteres"),
  name: z.string().trim().min(2, "Ingresa un nombre").max(120, "Máximo 120 caracteres"),
  detail: z.string().trim().max(240, "Máximo 240 caracteres"),
  status: z.enum(["active", "inactive"]),
  value: z.string().trim().max(40, "Máximo 40 caracteres"),
})

export const masterCatalogSchema = masterCatalogInputSchema.extend({ id: z.string() })
export type MasterCatalogInput = z.infer<typeof masterCatalogInputSchema>
export type MasterCatalogRecord = z.infer<typeof masterCatalogSchema>

export const EMPTY_MASTER_CATALOG: MasterCatalogInput = {
  code: "",
  name: "",
  detail: "",
  status: "active",
  value: "",
}
