import { z } from "zod"
import { todayInLima } from "@/shared/lib/dates"

export const COMMISSION_STATUSES = ["pending", "approved", "paid"] as const
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number]

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  paid: "Pagada",
}

const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/
const RATE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/

export const commissionInputSchema = z.object({
  seller_name: z.string().trim().min(2, "Ingresa el nombre del vendedor").max(120, "Máximo 120 caracteres"),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Selecciona un período válido"),
  sales_amount: z.string().regex(AMOUNT_PATTERN, "Monto no válido; ejemplo: 12500.00"),
  rate_percentage: z.string()
    .regex(RATE_PATTERN, "Ingresa un porcentaje válido")
    .refine((value) => Number(value) > 0 && Number(value) <= 100, "El porcentaje debe ser mayor que 0 y no superar 100"),
  status: z.enum(COMMISSION_STATUSES),
})

export const commissionSchema = commissionInputSchema.extend({
  id: z.string().uuid(),
  commission_amount: z.string().regex(AMOUNT_PATTERN, "Monto no válido"),
})

export type CommissionInput = z.infer<typeof commissionInputSchema>
export type Commission = z.infer<typeof commissionSchema>

export const EMPTY_COMMISSION: CommissionInput = {
  seller_name: "",
  period: todayInLima().slice(0, 7),
  sales_amount: "0.00",
  rate_percentage: "5",
  status: "pending",
}
