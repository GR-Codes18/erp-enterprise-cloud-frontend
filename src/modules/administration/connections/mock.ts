import { createCrudHandlers } from "@/mocks/utils/crud"

/** UUID fijos con el prefijo de conexiones (8015) */
const uuid = (n: number) => `00000000-0000-4000-8015-${String(n).padStart(12, "0")}`

export interface ConnectionRecord {
  id: string;
  proveedor: string;
  servicio: string;
  ambiente: "Producción" | "Pruebas / Sandbox";
  credenciales_referenciadas: string;
  estado: "Activo" | "Inactivo" | "Error";
  ultima_respuesta: string;
}

const seed: ConnectionRecord[] = [
  {
    id: uuid(1),
    proveedor: "SUNAT / OSE",
    servicio: "Emisión de Comprobantes Electrónicos",
    ambiente: "Producción",
    credenciales_referenciadas: "SECRET_SUNAT_PROD_***Key",
    estado: "Activo",
    ultima_respuesta: "200 OK (Conectado)",
  },
  {
    id: uuid(2),
    proveedor: "Banco de Crédito (BCP)",
    servicio: "Pasarela de Cobranzas B2B",
    ambiente: "Producción",
    credenciales_referenciadas: "BCP_API_CLIENT_ID_***Val",
    estado: "Activo",
    ultima_respuesta: "200 OK (Token válido)",
  },
]

export const connectionsHandlers = createCrudHandlers<ConnectionRecord>({
  resource: "connections",
  seed,
  searchFields: ["proveedor", "servicio", "ambiente"],
  filterFields: ["ambiente", "estado"],
  insertAt: "start",
  // Una conexión nueva aún no respondió: la última respuesta la fija el servidor
  createdFields: { ultima_respuesta: "Sin probar" },
  immutableFields: ["ultima_respuesta"],
  prepareCreate: (body) => ({
    proveedor: String(body.proveedor ?? "").trim(),
    servicio: String(body.servicio ?? "").trim(),
    credenciales_referenciadas: String(body.credenciales_referenciadas ?? "").trim(),
  }),
  prepareUpdate: (_current, body) => ({
    proveedor: String(body.proveedor ?? "").trim(),
    servicio: String(body.servicio ?? "").trim(),
    credenciales_referenciadas: String(body.credenciales_referenciadas ?? "").trim(),
  }),
  // Una conexión activa no se borra: se desactiva
  isInUse: (item) => item.estado === "Activo",
  inUseMessage: "La conexión está activa y no se puede eliminar. Puedes desactivarla.",
  validate: ({ action, next, items }) => {
    if (action === "delete" || !next) return undefined
    const key = (item: ConnectionRecord) => [item.proveedor, item.servicio, item.ambiente].join("|").toLowerCase()
    if (!items.some((item) => item.id !== next.id && key(item) === key(next))) return undefined
    const message = "Ya existe esta integración en el mismo ambiente"
    return { status: 409, code: "DUPLICATE", message, errors: [{ field: "servicio", message }] }
  },
})