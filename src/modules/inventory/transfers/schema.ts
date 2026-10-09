import { z } from "zod"

export const TRANSFER_STATUSES = ["draft", "in_transit", "received", "cancelled"] as const
export type TransferStatus = (typeof TRANSFER_STATUSES)[number]

export const TRANSFER_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  draft: ["in_transit", "cancelled"],
  in_transit: ["received"],
  received: [],
  cancelled: [],
}

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  draft: "Borrador",
  in_transit: "En tránsito",
  received: "Recibida",
  cancelled: "Cancelada",
}

export function canTransitionTransfer(from: TransferStatus, to: TransferStatus): boolean {
  return TRANSFER_TRANSITIONS[from].includes(to)
}

const transferItemSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  quantity: z.number({ message: "Ingresa una cantidad válida" }).int("La cantidad debe ser entera").positive("La cantidad debe ser mayor que cero"),
})

const transferFields = z.object({
  origin_warehouse_id: z.string().min(1, "Selecciona el almacén de origen"),
  destination_warehouse_id: z.string().min(1, "Selecciona el almacén de destino"),
  items: z.array(transferItemSchema).min(1, "Agrega al menos un producto"),
})

export const transferInputSchema = transferFields
  .refine((value) => value.origin_warehouse_id !== value.destination_warehouse_id, {
    message: "El origen y el destino deben ser distintos",
    path: ["destination_warehouse_id"],
  })
  .refine((value) => new Set(value.items.map((item) => item.product_id)).size === value.items.length, {
    message: "No repitas productos; consolida las cantidades en una sola línea",
    path: ["items"],
  })

export const transferSchema = transferFields.extend({
  id: z.string(),
  origin_warehouse_name: z.string(),
  destination_warehouse_name: z.string(),
  items: z.array(transferItemSchema.extend({ product_name: z.string().optional() })),
  status: z.enum(TRANSFER_STATUSES),
  created_at: z.string(),
})

export type TransferInput = z.infer<typeof transferInputSchema>
export type Transfer = z.infer<typeof transferSchema>

export const EMPTY_TRANSFER: TransferInput = {
  origin_warehouse_id: "",
  destination_warehouse_id: "",
  items: [{ product_id: "", quantity: 1 }],
}
