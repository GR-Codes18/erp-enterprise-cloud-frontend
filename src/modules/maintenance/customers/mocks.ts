import { createCrudHandlers } from "@/mocks/utils/crud"
import type { Customer, CustomerStatus, DocumentType } from "./schema"

/** UUID fijos y legibles (válidos v4): 00000000-0000-4000-8000-000000000001, ...002, etc. */
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

const customer = (
  n: number,
  document_type: DocumentType,
  document_number: string,
  name: string,
  email: string,
  phone: string,
  credit_limit: string,
  status: CustomerStatus
): Customer => ({
  id: uuid(n),
  document_type,
  document_number,
  name,
  email,
  phone,
  credit_limit,
  status,
})

// 12 registros para poder ver la paginación con size=10
const seed: Customer[] = [
  customer(1, "RUC", "20100000001", "Comercial Andina S.A.C.", "ventas@andina.example", "014000001", "5000.00", "active"),
  customer(2, "RUC", "20100000002", "Distribuidora Pacífico S.R.L.", "contacto@pacifico.example", "014000002", "12000.00", "active"),
  customer(3, "DNI", "70000003", "María Quispe Huamán", "maria.quispe@example.com", "999000003", "800.00", "active"),
  customer(4, "DNI", "70000004", "Luis Ramírez Torres", "luis.ramirez@example.com", "999000004", "1500.50", "active"),
  customer(5, "RUC", "20100000005", "Ferretería El Constructor E.I.R.L.", "", "014000005", "3000.00", "inactive"),
  customer(6, "DNI", "70000006", "Carmen Flores Vega", "carmen.flores@example.com", "999000006", "0.00", "active"),
  customer(7, "CE", "001234567", "John Smith", "john.smith@example.com", "999000007", "2500.00", "active"),
  customer(8, "RUC", "20100000008", "Agroexport del Sur S.A.", "info@agrosur.example", "054000008", "20000.00", "active"),
  customer(9, "DNI", "70000009", "Pedro Castillo Rojas", "", "999000009", "500.00", "inactive"),
  customer(10, "RUC", "20100000010", "Textiles Inca S.A.C.", "pedidos@textilesinca.example", "014000010", "8000.00", "active"),
  customer(11, "DNI", "70000011", "Ana Torres Salazar", "ana.torres@example.com", "999000011", "1200.00", "active"),
  customer(12, "CE", "002345678", "Marie Dubois", "marie.dubois@example.com", "999000012", "0.00", "inactive"),
]

/** Clientes 1 y 2 tienen ventas o cotizaciones asociadas */
const IN_USE_IDS = [uuid(1), uuid(2)]

export const customerHandlers = createCrudHandlers<Customer>({
  resource: "customers",
  seed,
  // Un registro nuevo aparece primero en el listado
  insertAt: "start",
  searchFields: ["name", "document_number", "email"],
  filterFields: ["status", "document_type"],
  // El documento es único por tipo + número (contrato): un DNI y un CE pueden compartir número
  validate: ({ next, items }) => {
    if (!next) return undefined
    const number = next.document_number.trim()
    const duplicate = items.some(
      (item) =>
        item.id !== next.id &&
        item.document_type === next.document_type &&
        item.document_number.trim() === number,
    )
    if (!duplicate) return undefined
    const message = "Ya existe un cliente con este tipo y número de documento"
    return { status: 409, code: "DUPLICATE", message, errors: [{ field: "document_number", message }] }
  },
  immutableFields: ["document_type", "document_number"],
  isInUse: (item) => IN_USE_IDS.includes(item.id),
  inUseMessage:
    "Este cliente tiene ventas, cotizaciones o comprobantes registrados y no se puede eliminar. Puedes desactivarlo para evitar nuevas operaciones.",
  prepareCreate: (body) => ({
    document_type: (body.document_type as DocumentType) || "DNI",
    document_number: String(body.document_number ?? "").trim(),
    name: String(body.name ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    credit_limit: String(body.credit_limit ?? "0.00").trim(),
    status: (body.status as CustomerStatus) || "active",
  }),
  prepareUpdate: (_current, body) => ({
    name: String(body.name ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    credit_limit: String(body.credit_limit ?? "0.00").trim(),
  }),
})