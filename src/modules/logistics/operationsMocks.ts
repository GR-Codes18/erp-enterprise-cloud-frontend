import { z } from "zod"
import { createCrudHandlers, type MockRuleError } from "@/mocks/utils/crud"
import {
  logisticsOperations,
  logisticsOperationInputSchema,
  type LogisticsOperation,
  type LogisticsOperationRecord,
} from "./operations"

const operationId = (number: number) =>
  `00000000-0000-4000-8020-${String(9000 + number).padStart(12, "0")}`

const seeds: Record<LogisticsOperation, LogisticsOperationRecord[]> = {
  "route-scheduling": [
    { id: operationId(1), route_code: "RUT-001", route_name: "Lima - Arequipa", origin: "Almacén Central, Lima", destination: "Arequipa", dispatch_date: "2026-10-24", return_date: "2026-10-26", status: "in_transit" },
    { id: operationId(2), route_code: "RUT-002", route_name: "Lima - Trujillo", origin: "Almacén Central, Lima", destination: "Trujillo", dispatch_date: "2026-10-25", return_date: "2026-10-26", status: "planned" },
  ],
  "vehicle-assignment": [
    { id: operationId(3), reference: "TR-2026-001", vehicle_plate: "ABC-123", vehicle_type: "Camión", capacity_kg: "8000", route: "Lima - Arequipa", assigned_date: "2026-10-24", status: "assigned" },
    { id: operationId(4), reference: "TR-2026-002", vehicle_plate: "DEF-456", vehicle_type: "Camioneta", capacity_kg: "2500", route: "Lima - Trujillo", assigned_date: "2026-10-25", status: "assigned" },
  ],
  "driver-assignment": [
    { id: operationId(5), reference: "TR-2026-001", driver_name: "Carlos Mendoza", document_number: "45872136", license_number: "Q45872136", vehicle_plate: "ABC-123", assigned_date: "2026-10-24", status: "assigned" },
    { id: operationId(6), reference: "TR-2026-002", driver_name: "Rosa Paredes", document_number: "41789235", license_number: "A41789235", vehicle_plate: "DEF-456", assigned_date: "2026-10-25", status: "assigned" },
  ],
  "delivery-tracking": [
    { id: operationId(7), reference: "TR-2026-001", transporter: "Transportes del Pacífico", route: "Lima - Arequipa", destination: "Arequipa", expected_date: "2026-10-25", last_update: "En tránsito hacia destino", status: "in_transit" },
    { id: operationId(8), reference: "TR-2026-002", transporter: "Logística Andina", route: "Lima - Trujillo", destination: "Trujillo", expected_date: "2026-10-25", last_update: "Pendiente de salida", status: "planned" },
  ],
  "delivery-confirmation": [
    { id: operationId(9), reference: "TR-2026-003", recipient: "María Salas", delivered_date: "2026-10-20", received_quantity: "24", evidence: "ACT-2026-003", notes: "Recepción conforme", status: "confirmed" },
  ],
  "route-returns": [
    { id: operationId(10), reference: "TR-2026-002", returned_date: "2026-10-25", reason: "Cliente no disponible", quantity: "2", condition: "Empaque cerrado", disposition: "return_to_warehouse", status: "open" },
  ],
  "route-costs-settlement": [
    { id: operationId(11), route_code: "RUT-003", settlement_date: "2026-10-20", fuel_cost: "280.00", toll_cost: "75.00", other_cost: "25.00", settled_by: "Elena Vargas", status: "settled" },
    { id: operationId(12), route_code: "RUT-001", settlement_date: "2026-10-24", fuel_cost: "420.00", toll_cost: "110.00", other_cost: "0.00", settled_by: "Elena Vargas", status: "pending" },
  ],
}

function validateOperation(
  resource: LogisticsOperation,
  next: unknown,
): MockRuleError | undefined {
  const parsed = logisticsOperationInputSchema(resource).extend({ id: z.string().uuid() }).safeParse(next)
  if (parsed.success) return undefined

  return {
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Revisa los datos de logística.",
    errors: parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? ""),
      message: issue.message,
    })),
  }
}

export const logisticsOperationHandlers = (Object.keys(logisticsOperations) as LogisticsOperation[]).flatMap((resource) => {
  const definition = logisticsOperations[resource]
  const searchFields = definition.fields.map((field) => field.key)
  const dateField = definition.fields.find((field) => field.type === "date")?.key

  return createCrudHandlers<LogisticsOperationRecord>({
    resource: `logistics/operations/${resource}`,
    seed: seeds[resource],
    searchFields,
    filterFields: ["status"],
    dateField,
    insertAt: "start",
    prepareCreate: (body) =>
      Object.fromEntries(definition.fields.map((field) => [field.key, String(body[field.key] ?? "").trim()])),
    prepareUpdate: (_current, body) =>
      Object.fromEntries(definition.fields.map((field) => [field.key, String(body[field.key] ?? "").trim()])),
    validate: ({ next }) => (next ? validateOperation(resource, next) : undefined),
  })
})
