import { createCrudHandlers } from "@/mocks/utils/crud"
import type { DocumentType, Supplier, SupplierStatus } from "./schema"

/** UUID fijos y legibles (válidos v4): 00000000-0000-4000-8001-000000000001, ...002, etc. */
const uuid = (n: number) => `00000000-0000-4000-8001-${String(n).padStart(12, "0")}`

const supplier = (
  n: number,
  document_type: DocumentType,
  document_number: string,
  name: string,
  email: string,
  phone: string,
  credit_days: number,
  status: SupplierStatus
): Supplier => ({
  id: uuid(n),
  document_type,
  document_number,
  name,
  email,
  phone,
  credit_days,
  status,
})

// 12 registros para poder ver la paginación con size=10
const seed: Supplier[] = [
  supplier(1, "RUC", "20500000001", "Aceros y Perfiles del Perú S.A.C.", "contacto@acerosperu.example", "015000001", 30, "active"),
  supplier(2, "RUC", "20500000002", "Importaciones Logísticas Globales S.R.L.", "ventas@logisticaglobal.example", "015000002", 60, "active"),
  supplier(3, "DNI", "10000003", "Carlos Eduardo Mendoza", "carlos.mendoza@example.com", "988000003", 0, "active"),
  supplier(4, "DNI", "10000004", "Sofía Elena Benítez", "sofia.benitez@example.com", "988000004", 15, "active"),
  supplier(5, "RUC", "20500000005", "Distribuidora Industrial E.I.R.L.", "", "015000005", 30, "inactive"),
  supplier(6, "DNI", "10000006", "Roberto Gómez Bolaños", "roberto.gomez@example.com", "988000006", 0, "active"),
  supplier(7, "CE", "005234567", "Hans Mueller", "hans.mueller@example.com", "988000007", 45, "active"),
  supplier(8, "RUC", "20500000008", "Proveedora de Insumos del Norte S.A.", "ventas@insumosnorte.example", "074000008", 60, "active"),
  supplier(9, "DNI", "10000009", "Javier Paredes Silva", "", "988000009", 0, "inactive"),
  supplier(10, "RUC", "20500000010", "Comercializadora Química S.A.C.", "pedidos@quimica.example", "015000010", 30, "active"),
  supplier(11, "DNI", "10000011", "Lucía Morales Ríos", "lucia.morales@example.com", "988000011", 15, "active"),
  supplier(12, "CE", "006234567", "Pierre Dupont", "pierre.dupont@example.com", "988000012", 0, "inactive"),
]

/** Proveedores 1 y 2 tienen operaciones asociadas */
const IN_USE_IDS = [uuid(1), uuid(2)]

export const supplierHandlers = createCrudHandlers<Supplier>({
  resource: "suppliers",
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
    const message = "Ya existe un proveedor con este tipo y número de documento"
    return { status: 409, code: "DUPLICATE", message, errors: [{ field: "document_number", message }] }
  },
  immutableFields: ["document_type", "document_number"],
  isInUse: (item) => IN_USE_IDS.includes(item.id),
  inUseMessage:
    "Este proveedor tiene comprobantes u operaciones registradas y no se puede eliminar. Puedes desactivarlo para evitar nuevas operaciones.",
  prepareCreate: (body) => ({
    document_type: (body.document_type as DocumentType) || "RUC",
    document_number: String(body.document_number ?? "").trim(),
    name: String(body.name ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    credit_days: Number(body.credit_days ?? 0),
    status: (body.status as SupplierStatus) || "active",
  }),
  prepareUpdate: (_current, body) => ({
    name: String(body.name ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    credit_days: Number(body.credit_days ?? 0),
  }),
})