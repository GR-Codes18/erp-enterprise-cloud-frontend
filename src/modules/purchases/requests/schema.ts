import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { DUPLICATE_PRODUCTS_MESSAGE, hasDuplicateProducts } from "@/shared/lib/lines"
import { businessDateSchema } from "@/shared/lib/schemas"

export const REQUEST_STATUSES = ["draft", "pending", "approved", "rejected"] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

/** El rechazo lleva motivo. Quien aprueba o rechaza no puede ser quien solicita */
export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  draft: ["pending"],
  pending: ["approved", "rejected"],
  approved: [],
  rejected: [],
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente de aprobación",
  approved: "Aprobada",
  rejected: "Rechazada",
}

export const REQUEST_STATUS_TONES: Record<RequestStatus, StatusTone> = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
}

export function canTransitionRequest(from: RequestStatus, to: RequestStatus): boolean {
  return REQUEST_TRANSITIONS[from].includes(to)
}

/** Segregación de funciones: nadie aprueba su propia solicitud (el backend lo vuelve a validar) */
export function canDecideRequest(request: { status: RequestStatus; requested_by: string }, userId: string | undefined) {
  return request.status === "pending" && userId !== undefined && request.requested_by !== userId
}

const requestLineSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  quantity: z
    .number({ message: "Ingresa una cantidad válida" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor que cero"),
})

export const requestInputSchema = z.object({
  items: z
    .array(requestLineSchema)
    .min(1, "Agrega al menos un producto")
    .refine((lines) => !hasDuplicateProducts(lines), DUPLICATE_PRODUCTS_MESSAGE),
  justification: z.string().trim().min(10, "Explica para qué se necesita (mínimo 10 caracteres)").max(500, "Máximo 500 caracteres"),
  needed_by: businessDateSchema("Ingresa la fecha en que se necesita"),
})

export type RequestInput = z.infer<typeof requestInputSchema>

export const purchaseRequestSchema = z.object({
  id: z.string(),
  number: z.string(),
  items: z.array(requestLineSchema.extend({ product_name: z.string() })),
  justification: z.string(),
  needed_by: z.string(),
  status: z.enum(REQUEST_STATUSES),
  requested_by: z.string(),
  requested_by_name: z.string(),
  decided_by_name: z.string(),
  rejection_reason: z.string(),
  created_at: z.string(),
})

export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>

export function emptyRequest(neededBy: string): RequestInput {
  return { items: [{ product_id: "", quantity: 1 }], justification: "", needed_by: neededBy }
}
