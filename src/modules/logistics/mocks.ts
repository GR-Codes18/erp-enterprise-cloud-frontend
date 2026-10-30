import { createCrudHandlers, type MockRuleError } from "@/mocks/utils/crud"
import { shipmentSchema, type Shipment } from "./schema"

const shipmentId = (number: number) => `00000000-0000-4000-8020-${String(number).padStart(12, "0")}`

export const shipmentSeed: Shipment[] = [
  {
    id: shipmentId(1),
    reference: "TR-2026-001",
    transporter: "Transportes del Pacífico",
    origin: "Almacén Central, Lima",
    destination: "Arequipa",
    scheduled_date: "2026-10-24",
    freight_amount: "850.00",
    status: "in_transit",
  },
  {
    id: shipmentId(2),
    reference: "TR-2026-002",
    transporter: "Logística Andina",
    origin: "Almacén Central, Lima",
    destination: "Trujillo",
    scheduled_date: "2026-10-25",
    freight_amount: "620.50",
    status: "planned",
  },
  {
    id: shipmentId(3),
    reference: "TR-2026-003",
    transporter: "Carga Segura S.A.C.",
    origin: "Sucursal Arequipa",
    destination: "Cusco",
    scheduled_date: "2026-10-20",
    freight_amount: "430.00",
    status: "delivered",
  },
]

function validateShipment(next: unknown): MockRuleError | undefined {
  const parsed = shipmentSchema.safeParse(next)
  if (parsed.success) return undefined
  const errors = parsed.error.issues.map((issue) => ({
    field: String(issue.path[0] ?? ""),
    message: issue.message,
  }))
  return {
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Revisa los datos del transporte.",
    errors,
  }
}

export const logisticsHandlers = createCrudHandlers<Shipment>({
  resource: "logistics/shipments",
  seed: shipmentSeed,
  searchFields: ["reference", "transporter", "origin", "destination"],
  filterFields: ["status"],
  dateField: "scheduled_date",
  insertAt: "start",
  uniqueFields: [{ field: "reference", label: "número de referencia" }],
  validate: ({ next }) => (next ? validateShipment(next) : undefined),
})
