import { createCrudHandlers } from "@/mocks/utils/crud"
import { isBranchInUse, isCurrencyInUse, isPaymentMethodInUse } from "@/modules/finance/mocks"
import { isProductUnitInUse } from "@/modules/maintenance/products/mocks"
import {
  MASTER_CATALOG_RESOURCES,
  masterCatalogInputSchema,
  type MasterCatalogRecord,
  type MasterCatalogResource,
} from "./schema"

const uuid = (number: number) => `00000000-0000-4000-8000-${String(8100 + number).padStart(12, "0")}`
const normalizeValue = (resource: MasterCatalogResource, value: unknown) => {
  const text = String(value ?? "").trim()
  return resource === "payment-methods" ? text.toLowerCase() : text.toUpperCase()
}

const seedByResource: Record<MasterCatalogResource, MasterCatalogRecord[]> = {
  companies: [
    { id: uuid(1), code: "EMP-001", name: "ERP Holding SAC", detail: "Lima · RUC 20602485071", status: "active", value: "" },
    { id: uuid(2), code: "EMP-002", name: "Logística Norte SRL", detail: "Arequipa · RUC 20546821301", status: "active", value: "" },
    { id: uuid(3), code: "EMP-003", name: "Plaza del Sur EIRL", detail: "Cusco · RUC 20457862130", status: "inactive", value: "" },
  ],
  branches: [
    { id: uuid(4), code: "SUC-001", name: "Sucursal Central", detail: "Lima · Av. Principal 245", status: "active", value: "" },
    { id: uuid(5), code: "SUC-002", name: "Sucursal Norte", detail: "Trujillo · Calle 11, zona industrial", status: "active", value: "" },
    { id: uuid(6), code: "SUC-003", name: "Sucursal Sur", detail: "Cusco · Av. Real 89", status: "inactive", value: "" },
  ],
  brands: [
    { id: uuid(7), code: "MAR-001", name: "Samsung", detail: "Electrónica · soporte técnico", status: "active", value: "" },
    { id: uuid(8), code: "MAR-002", name: "Nike", detail: "Calzado · accesorios corporativos", status: "active", value: "" },
    { id: uuid(9), code: "MAR-003", name: "Bosch", detail: "Herramientas · importación", status: "inactive", value: "" },
  ],
  units: [
    { id: uuid(10), code: "UND-001", name: "Unidad", detail: "Pieza individual", status: "active", value: "UND" },
    { id: uuid(11), code: "UND-002", name: "Kilogramo", detail: "Peso bruto", status: "active", value: "KG" },
    { id: uuid(12), code: "UND-003", name: "Litro", detail: "Volumen", status: "active", value: "LT" },
    { id: uuid(13), code: "UND-004", name: "Metro", detail: "Longitud", status: "active", value: "M" },
    { id: uuid(14), code: "UND-005", name: "Caja", detail: "Empaque", status: "active", value: "CAJA" },
    { id: uuid(15), code: "UND-006", name: "Bolsa", detail: "Empaque", status: "active", value: "BOLSA" },
    { id: uuid(16), code: "UND-007", name: "Paquete", detail: "Empaque", status: "active", value: "PAQ" },
  ],
  "unit-conversions": [
    { id: uuid(17), code: "CON-001", name: "Caja a UND", detail: "1 caja = 12 unidades", status: "active", value: "" },
    { id: uuid(18), code: "CON-002", name: "Kilogramo a Libra", detail: "1 kg = 2.20462 lb", status: "active", value: "" },
    { id: uuid(19), code: "CON-003", name: "Litro a Mililitro", detail: "1 litro = 1000 ml", status: "inactive", value: "" },
  ],
  transporters: [
    { id: uuid(20), code: "TRA-001", name: "Mundo Express", detail: "RUC 20123344081 · rutas nacionales", status: "active", value: "" },
    { id: uuid(21), code: "TRA-002", name: "Cargomax S.A.C.", detail: "RUC 20190023122 · logística de frío", status: "active", value: "" },
    { id: uuid(22), code: "TRA-003", name: "Velocidad Plus", detail: "RUC 20443311091 · reparto local", status: "inactive", value: "" },
  ],
  sellers: [
    { id: uuid(23), code: "VEN-001", name: "Ana Torres", detail: "Zona sur · comisión 6%", status: "active", value: "" },
    { id: uuid(24), code: "VEN-002", name: "Luis Rojas", detail: "Zona centro · comisión 5%", status: "active", value: "" },
    { id: uuid(25), code: "VEN-003", name: "Marta Sifuentes", detail: "Zona norte · comisión 7%", status: "inactive", value: "" },
  ],
  zones: [
    { id: uuid(26), code: "ZON-001", name: "Lima Centro", detail: "Cobertura urbana central", status: "active", value: "" },
    { id: uuid(27), code: "ZON-002", name: "Costa Norte", detail: "Trujillo y Chiclayo", status: "active", value: "" },
    { id: uuid(28), code: "ZON-003", name: "Andes Sur", detail: "Cusco y Arequipa", status: "inactive", value: "" },
  ],
  currencies: [
    { id: uuid(29), code: "CUR-001", name: "Sol", detail: "Tipo de cambio base 1.00", status: "active", value: "PEN" },
    { id: uuid(30), code: "CUR-002", name: "Dólar", detail: "Tipo de cambio 3.72", status: "active", value: "USD" },
    { id: uuid(31), code: "CUR-003", name: "Euro", detail: "Tipo de cambio 4.10", status: "inactive", value: "EUR" },
  ],
  taxes: [
    { id: uuid(32), code: "TAX-001", name: "IGV", detail: "18% · ventas y compras", status: "active", value: "18" },
    { id: uuid(33), code: "TAX-002", name: "ISC", detail: "4% · algunos bienes", status: "active", value: "4" },
    { id: uuid(34), code: "TAX-003", name: "Percepción", detail: "2% · servicios selectos", status: "inactive", value: "2" },
  ],
  "payment-methods": [
    { id: uuid(35), code: "PAY-001", name: "Efectivo", detail: "Pago al contado", status: "active", value: "cash" },
    { id: uuid(36), code: "PAY-002", name: "Transferencia", detail: "Transferencia bancaria", status: "active", value: "transfer" },
    { id: uuid(37), code: "PAY-003", name: "Tarjeta", detail: "Visa y Mastercard", status: "active", value: "card" },
  ],
  "price-lists": [
    { id: uuid(38), code: "PRI-001", name: "Lista General", detail: "Vigente 2026 · PEN", status: "active", value: "" },
    { id: uuid(39), code: "PRI-002", name: "Distribuidores", detail: "Descuento por volumen", status: "active", value: "" },
    { id: uuid(40), code: "PRI-003", name: "Mayoristas", detail: "Precios corporativos", status: "inactive", value: "" },
  ],
}

export const masterCatalogHandlers = MASTER_CATALOG_RESOURCES.flatMap((resource) =>
  createCrudHandlers<MasterCatalogRecord>({
    resource: `maintenance/catalogs/${resource}`,
    seed: seedByResource[resource],
    insertAt: "start",
    searchFields: ["code", "name", "detail", "value"],
    filterFields: ["status"],
    uniqueFields: [
      { field: "code", label: "código" },
      ...(resource === "currencies" || resource === "units" || resource === "payment-methods"
        ? [{ field: "value" as const, label: "valor de integración" }]
        : []),
    ],
    prepareCreate: (body) => ({
      code: String(body.code ?? "").trim().toUpperCase(),
      name: String(body.name ?? "").trim(),
      detail: String(body.detail ?? "").trim(),
      status: body.status === "inactive" ? "inactive" : "active",
      value: normalizeValue(resource, body.value),
    }),
    prepareUpdate: (_current, body) => ({
      code: String(body.code ?? "").trim().toUpperCase(),
      name: String(body.name ?? "").trim(),
      detail: String(body.detail ?? "").trim(),
      status: body.status === "inactive" ? "inactive" : "active",
      value: normalizeValue(resource, body.value),
    }),
    validate: ({ action, current, next }) => {
      if (!next) return undefined
      if (action === "update" && current && current.value !== next.value && isValueInUse(resource, current.value)) {
        const message = "Este valor ya se utiliza en otros módulos y no se puede cambiar."
        return { status: 409, code: "IN_USE", message, errors: [{ field: "value", message }] }
      }
      const result = masterCatalogInputSchema.safeParse(next)
      const errors = result.success
        ? []
        : result.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? ""),
            message: issue.message,
          }))
      if (result.success && resource === "currencies" && !/^[A-Z]{3}$/.test(next.value)) {
        errors.push({ field: "value", message: "Ingresa un código ISO de moneda de 3 letras." })
      }
      if (result.success && resource === "units" && !/^[A-Z0-9_-]{1,20}$/.test(next.value)) {
        errors.push({ field: "value", message: "Ingresa un código de unidad válido." })
      }
      if (result.success && resource === "payment-methods" && !["cash", "transfer", "card"].includes(next.value)) {
        errors.push({ field: "value", message: "Tesorería admite efectivo (cash), transferencia (transfer) o tarjeta (card)." })
      }
      if (errors.length === 0) return undefined
      return {
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Revisa los datos ingresados.",
        errors,
      }
    },
    isInUse: (item) => resource === "branches" ? isBranchInUse(item.id) : isValueInUse(resource, item.value),
    inUseMessage: "Este valor ya se utiliza en otros módulos. Puedes desactivarlo para evitar nuevas operaciones.",
  }),
)

function isValueInUse(resource: MasterCatalogResource, value: string): boolean {
  if (!value) return false
  if (resource === "currencies") return isCurrencyInUse(value)
  if (resource === "units") return isProductUnitInUse(value)
  if (resource === "payment-methods") return isPaymentMethodInUse(value)
  return false
}
