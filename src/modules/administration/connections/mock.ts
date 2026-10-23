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
})