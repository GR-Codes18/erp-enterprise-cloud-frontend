import { createCrudHandlers } from "@/mocks/createCrudHandlers"
import type { Warehouse, WarehouseStatus } from "./schema"

/** UUID fijos con prefijo 8003: 00000000-0000-4000-8003-000000000001, ...002, etc. */
const uuid = (n: number) => `00000000-0000-4000-8003-${String(n).padStart(12, "0")}`

const warehouse = (
  n: number,
  code: string,
  name: string,
  address: string,
  status: WarehouseStatus
): Warehouse => ({
  id: uuid(n),
  code,
  name,
  address,
  status,
})

// 12 registros semilla para validar paginación (size=10)
const seed: Warehouse[] = [
  warehouse(1, "ALM-001", "Almacén Central Principal", "Av. Argentina 1420, Lima", "active"),
  warehouse(2, "ALM-002", "Almacén de Materia Prima", "Av. Néstor Gambetta Km 3.5, Callao", "active"),
  warehouse(3, "ALM-003", "Almacén de Productos Terminados", "Av. Industrial 450, Ate", "active"),
  warehouse(4, "ALM-004", "Depósito San Juan de Lurigancho", "Av. Próceres de la Independencia 2100", "active"),
  warehouse(5, "ALM-005", "Almacén Sur Villa El Salvador", "Av. El Sol 1200, Villa El Salvador", "active"),
  warehouse(6, "ALM-006", "Almacén Norte Los Olivos", "Av. Universitaria 3400, Los Olivos", "active"),
  warehouse(7, "ALM-007", "Depósito Temporal Callao", "Av. Elmer Faucett 2800, Callao", "active"),
  warehouse(8, "ALM-008", "Almacén Repuestos y Herramientas", "Calle Los Metalúrgicos 180, Vulcano", "active"),
  warehouse(9, "ALM-009", "Depósito Mantenimiento Inactivo", "Av. Argentina 890, Lima", "inactive"),
  warehouse(10, "ALM-010", "Almacén Auxiliar Ate", "Av. Separadora Industrial 230, Ate", "active"),
  warehouse(11, "ALM-011", "Almacén Transitorio Arequipa", "Via Evitamiento Km 2, Arequipa", "active"),
  warehouse(12, "ALM-012", "Depósito Antiguo Chorrillos", "Av. Defensores del Morro 1500", "inactive"),
]

/** Almacenes en uso (ALM-001, ALM-002) */
const IN_USE_IDS = [uuid(1), uuid(2)]

export const warehouseHandlers = createCrudHandlers<Warehouse>({
  endpoint: "*/warehouses",
  items: seed,
  searchFields: ["code", "name"],
  filterFields: ["status"],
  uniqueFields: [
    {
      field: "code",
      label: "código",
      normalize: (val: unknown) => String(val ?? "").trim().toUpperCase(),
    },
  ],
  immutableFields: ["code"],
  inUseIds: IN_USE_IDS,
  inUseMessage:
    "Este almacén tiene existencias o movimientos registrados y no se puede eliminar. Puedes desactivarlo para evitar nuevos movimientos.",
  onBeforeCreate: (body: Record<string, unknown>, currentItems: Warehouse[]) => ({
    id: uuid(currentItems.length + 1),
    code: String(body.code ?? "").trim().toUpperCase(),
    name: String(body.name ?? "").trim(),
    address: String(body.address ?? "").trim(),
    status: (body.status as WarehouseStatus) || "active",
  }),
  onBeforeUpdate: (_current: Warehouse, body: Record<string, unknown>) => ({
    name: String(body.name ?? "").trim(),
    address: String(body.address ?? "").trim(),
  }),
})