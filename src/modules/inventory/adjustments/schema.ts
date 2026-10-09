import { z } from "zod"

export const ADJUSTMENT_STATUSES = ["draft", "applied"] as const
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number]

export const ADJUSTMENT_TRANSITIONS: Record<AdjustmentStatus, AdjustmentStatus[]> = {
  draft: ["applied"],
  applied: [],
}

export const ADJUSTMENT_STATUS_LABELS: Record<AdjustmentStatus, string> = {
  draft: "Borrador",
  applied: "Aplicado",
}

export const ADJUSTMENT_REASONS = ["physical_count", "shrinkage", "damage", "expiration", "other"] as const
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number]

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  physical_count: "Conteo físico",
  shrinkage: "Merma",
  damage: "Daño",
  expiration: "Vencimiento",
  other: "Otro",
}

export function canTransitionAdjustment(from: AdjustmentStatus, to: AdjustmentStatus): boolean {
  return ADJUSTMENT_TRANSITIONS[from].includes(to)
}

const adjustmentItemSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  direction: z.enum(["increase", "decrease"]),
  quantity: z.number({ message: "Ingresa una cantidad válida" }).int("La cantidad debe ser entera").positive("La cantidad debe ser mayor que cero"),
})

const adjustmentFields = z.object({
  warehouse_id: z.string().min(1, "Selecciona un almacén"),
  items: z.array(adjustmentItemSchema).min(1, "Agrega al menos un producto"),
  reason: z.enum(ADJUSTMENT_REASONS, { message: "Selecciona un motivo" }),
  notes: z.string().trim().max(500, "Máximo 500 caracteres"),
})

export const adjustmentInputSchema = adjustmentFields.refine(
  (value) => new Set(value.items.map((item) => item.product_id)).size === value.items.length,
  {
    message: "No repitas productos; consolida las cantidades en una sola línea",
    path: ["items"],
  },
)

export const adjustmentSchema = adjustmentFields.extend({
  id: z.string(),
  warehouse_name: z.string(),
  items: z.array(adjustmentItemSchema.extend({ product_name: z.string().optional() })),
  status: z.enum(ADJUSTMENT_STATUSES),
  created_at: z.string(),
})

export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>
export type Adjustment = z.infer<typeof adjustmentSchema>

export const EMPTY_ADJUSTMENT: AdjustmentInput = {
  warehouse_id: "",
  items: [{ product_id: "", direction: "increase", quantity: 1 }],
  reason: "physical_count",
  notes: "",
}
