import { z } from "zod"

export interface LogisticsOption {
  value: string
  label: string
}

export interface LogisticsField {
  key: string
  label: string
  type: "text" | "date" | "number" | "money" | "select" | "textarea"
  required?: boolean
  options?: LogisticsOption[]
}

export interface LogisticsOperationDefinition {
  title: string
  description: string
  createLabel: string
  searchPlaceholder: string
  fields: LogisticsField[]
  columns: string[]
}

const shipmentStatuses: LogisticsOption[] = [
  { value: "planned", label: "Programado" },
  { value: "in_transit", label: "En tránsito" },
  { value: "delivered", label: "Entregado" },
  { value: "incident", label: "Con incidencia" },
]

export const logisticsOperations = {
  "route-scheduling": {
    title: "Programación de rutas",
    description: "Organiza recorridos, fechas y estado de las rutas asignadas a los despachos.",
    createLabel: "Programar ruta",
    searchPlaceholder: "Buscar código, ruta u origen",
    fields: [
      { key: "route_code", label: "Código de ruta", type: "text" },
      { key: "route_name", label: "Nombre de ruta", type: "text" },
      { key: "origin", label: "Origen", type: "text" },
      { key: "destination", label: "Destino", type: "text" },
      { key: "dispatch_date", label: "Fecha de salida", type: "date" },
      { key: "return_date", label: "Fecha de retorno", type: "date", required: false },
      { key: "status", label: "Estado", type: "select", options: shipmentStatuses },
    ],
    columns: ["route_code", "route_name", "origin", "destination", "dispatch_date", "status"],
  },
  "vehicle-assignment": {
    title: "Asignación de vehículos",
    description: "Asigna vehículos a despachos y rutas y consulta su capacidad y disponibilidad.",
    createLabel: "Asignar vehículo",
    searchPlaceholder: "Buscar despacho, placa o ruta",
    fields: [
      { key: "reference", label: "Referencia de despacho", type: "text" },
      { key: "vehicle_plate", label: "Placa", type: "text" },
      { key: "vehicle_type", label: "Tipo de vehículo", type: "text" },
      { key: "capacity_kg", label: "Capacidad (kg)", type: "number" },
      { key: "route", label: "Ruta", type: "text" },
      { key: "assigned_date", label: "Fecha de asignación", type: "date" },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: [
          { value: "assigned", label: "Asignado" },
          { value: "available", label: "Disponible" },
          { value: "maintenance", label: "En mantenimiento" },
        ],
      },
    ],
    columns: ["reference", "vehicle_plate", "vehicle_type", "capacity_kg", "route", "status"],
  },
  "driver-assignment": {
    title: "Asignación de conductores",
    description: "Registra el conductor responsable y su vehículo para cada despacho.",
    createLabel: "Asignar conductor",
    searchPlaceholder: "Buscar despacho, conductor o placa",
    fields: [
      { key: "reference", label: "Referencia de despacho", type: "text" },
      { key: "driver_name", label: "Conductor", type: "text" },
      { key: "document_number", label: "Documento", type: "text" },
      { key: "license_number", label: "Licencia", type: "text" },
      { key: "vehicle_plate", label: "Placa asignada", type: "text" },
      { key: "assigned_date", label: "Fecha de asignación", type: "date" },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: [
          { value: "assigned", label: "Asignado" },
          { value: "available", label: "Disponible" },
          { value: "off_duty", label: "Fuera de servicio" },
        ],
      },
    ],
    columns: ["reference", "driver_name", "document_number", "license_number", "vehicle_plate", "status"],
  },
  "delivery-tracking": {
    title: "Seguimiento de entregas",
    description: "Monitorea el avance de los despachos, la fecha prevista y las novedades de ruta.",
    createLabel: "Registrar seguimiento",
    searchPlaceholder: "Buscar referencia, destino o transportista",
    fields: [
      { key: "reference", label: "Referencia de despacho", type: "text" },
      { key: "transporter", label: "Transportista", type: "text" },
      { key: "route", label: "Ruta", type: "text" },
      { key: "destination", label: "Destino", type: "text" },
      { key: "expected_date", label: "Fecha prevista", type: "date" },
      { key: "last_update", label: "Última novedad", type: "textarea", required: false },
      { key: "status", label: "Estado de entrega", type: "select", options: shipmentStatuses },
    ],
    columns: ["reference", "transporter", "route", "destination", "expected_date", "status"],
  },
  "delivery-confirmation": {
    title: "Confirmación de entrega",
    description: "Registra quién recibió el despacho, la fecha y la evidencia de entrega.",
    createLabel: "Confirmar entrega",
    searchPlaceholder: "Buscar referencia o destinatario",
    fields: [
      { key: "reference", label: "Referencia de despacho", type: "text" },
      { key: "recipient", label: "Persona que recibe", type: "text" },
      { key: "delivered_date", label: "Fecha de entrega", type: "date" },
      { key: "received_quantity", label: "Cantidad recibida", type: "number" },
      { key: "evidence", label: "Evidencia / constancia", type: "text", required: false },
      { key: "notes", label: "Observaciones", type: "textarea", required: false },
      {
        key: "status",
        label: "Resultado",
        type: "select",
        options: [
          { value: "confirmed", label: "Confirmada" },
          { value: "partial", label: "Parcial" },
          { value: "rejected", label: "Rechazada" },
        ],
      },
    ],
    columns: ["reference", "recipient", "delivered_date", "received_quantity", "evidence", "status"],
  },
  "route-returns": {
    title: "Devoluciones en ruta",
    description: "Registra productos devueltos durante el recorrido y su disposición.",
    createLabel: "Registrar devolución",
    searchPlaceholder: "Buscar referencia, motivo o conductor",
    fields: [
      { key: "reference", label: "Referencia de despacho", type: "text" },
      { key: "returned_date", label: "Fecha de devolución", type: "date" },
      { key: "reason", label: "Motivo", type: "textarea" },
      { key: "quantity", label: "Cantidad devuelta", type: "number" },
      { key: "condition", label: "Condición del producto", type: "text" },
      {
        key: "disposition",
        label: "Disposición",
        type: "select",
        options: [
          { value: "return_to_warehouse", label: "Retorno a almacén" },
          { value: "replacement", label: "Reponer producto" },
          { value: "review", label: "Pendiente de revisión" },
        ],
      },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: [
          { value: "open", label: "Abierta" },
          { value: "received", label: "Recibida" },
          { value: "resolved", label: "Resuelta" },
        ],
      },
    ],
    columns: ["reference", "returned_date", "reason", "quantity", "disposition", "status"],
  },
  "route-costs-settlement": {
    title: "Costos y liquidación de ruta",
    description: "Consolida los gastos de combustible, peajes y otros conceptos para liquidar cada ruta.",
    createLabel: "Registrar liquidación",
    searchPlaceholder: "Buscar código de ruta o responsable",
    fields: [
      { key: "route_code", label: "Código de ruta", type: "text" },
      { key: "settlement_date", label: "Fecha de liquidación", type: "date" },
      { key: "fuel_cost", label: "Combustible (S/)", type: "money" },
      { key: "toll_cost", label: "Peajes (S/)", type: "money" },
      { key: "other_cost", label: "Otros costos (S/)", type: "money" },
      { key: "settled_by", label: "Responsable", type: "text" },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: [
          { value: "pending", label: "Pendiente" },
          { value: "settled", label: "Liquidada" },
        ],
      },
    ],
    columns: ["route_code", "settlement_date", "fuel_cost", "toll_cost", "other_cost", "status"],
  },
} satisfies Record<string, LogisticsOperationDefinition>

export type LogisticsOperation = keyof typeof logisticsOperations

export interface LogisticsOperationRecord {
  id: string
  [key: string]: string
}

export type LogisticsOperationInput = Omit<LogisticsOperationRecord, "id">

export function getLogisticsFieldLabel(definition: LogisticsOperationDefinition, key: string): string {
  return definition.fields.find((field) => field.key === key)?.label ?? key
}

export function logisticsOperationInputSchema(resource: LogisticsOperation) {
  const shape: Record<string, z.ZodType> = {}

  for (const field of logisticsOperations[resource].fields as LogisticsField[]) {
    let valueSchema = z.string()
    if (field.required !== false) valueSchema = valueSchema.trim().min(1, `Ingresa ${field.label.toLowerCase()}`)
    if (field.type === "date") {
      valueSchema = valueSchema.refine(
        (value) => !value || z.iso.date().safeParse(value).success,
        "Ingresa una fecha válida",
      )
    }
    if (field.type === "number") valueSchema = valueSchema.regex(/^\d+(\.\d+)?$/, "Ingresa un número válido")
    if (field.type === "money") valueSchema = valueSchema.regex(/^\d+(\.\d{1,2})?$/, "Ingresa un importe válido")
    if (field.type === "select" && field.options) {
      shape[field.key] = z.enum(field.options.map((option) => option.value) as [string, ...string[]])
    } else {
      shape[field.key] = valueSchema
    }
  }

  return z.object(shape)
}
