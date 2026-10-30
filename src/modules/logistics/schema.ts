import { z } from "zod"
import { isBusinessDate, todayInLima } from "@/shared/lib/dates"

export const SHIPMENT_STATUSES = ["planned", "in_transit", "delivered", "cancelled"] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  planned: "Programado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  cancelled: "Cancelado",
}

const AMOUNT_PATTERN = /^\d{1,8}(\.\d{1,2})?$/
export const shipmentInputSchema = z.object({
  reference: z.string().trim().min(2, "Ingresa una referencia").max(40, "Máximo 40 caracteres"),
  transporter: z.string().trim().min(2, "Ingresa el transportista").max(120, "Máximo 120 caracteres"),
  origin: z.string().trim().min(2, "Ingresa el origen").max(160, "Máximo 160 caracteres"),
  destination: z.string().trim().min(2, "Ingresa el destino").max(160, "Máximo 160 caracteres"),
  scheduled_date: z.string().refine(
    isBusinessDate,
    "Ingresa una fecha válida",
  ),
  freight_amount: z.string().regex(AMOUNT_PATTERN, "Monto no válido; ejemplo: 150.00"),
  status: z.enum(SHIPMENT_STATUSES),
})

export const shipmentSchema = shipmentInputSchema.extend({ id: z.string().uuid() })

export type ShipmentInput = z.infer<typeof shipmentInputSchema>
export type Shipment = z.infer<typeof shipmentSchema>

export const EMPTY_SHIPMENT: ShipmentInput = {
  reference: "",
  transporter: "",
  origin: "",
  destination: "",
  scheduled_date: todayInLima(),
  freight_amount: "0.00",
  status: "planned",
}
