import { z } from 'zod'
import type { StatusTone } from '@/shared/components/StatusBadge'
import { businessDateSchema, notesSchema } from '@/shared/lib/schemas'

export const DESPATCH_STATUSES = ['draft', 'planned'] as const
export type DespatchStatus = (typeof DESPATCH_STATUSES)[number]

export const DESPATCH_TRANSITIONS: Record<DespatchStatus, DespatchStatus[]> = {
  draft: ['planned'],
  planned: [],
}

export const DESPATCH_STATUS_LABELS: Record<DespatchStatus, string> = {
  draft: 'Borrador',
  planned: 'Planificada',
}

export const DESPATCH_STATUS_TONES: Record<DespatchStatus, StatusTone> = {
  draft: 'neutral',
  planned: 'success',
}

export function canTransitionDespatch(from: DespatchStatus, to: DespatchStatus): boolean {
  return DESPATCH_TRANSITIONS[from].includes(to)
}

export const despatchLineInputSchema = z.object({
  product_id: z.string().min(1, 'Selecciona un producto'),
  quantity: z.number({ message: 'Ingresa una cantidad válida' }).int('La cantidad debe ser entera').positive('La cantidad debe ser mayor que cero'),
})

export const despatchInputSchema = z.object({
  customer_id: z.string().min(1, 'Selecciona un cliente'),
  items: z.array(despatchLineInputSchema).min(1, 'Agrega al menos un producto'),
  delivery_address: z.string().trim().min(5, 'Ingresa la dirección de entrega'),
  delivery_date: businessDateSchema('Ingresa la fecha de entrega'),
  notes: notesSchema,
}).refine((despatch) => despatch.delivery_date >= '2026-10-23', {
  message: 'La fecha de entrega no puede ser anterior a hoy',
  path: ['delivery_date'],
})

export type DespatchInput = z.infer<typeof despatchInputSchema>

const despatchLineSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
})

export const despatchSchema = z.object({
  id: z.string(),
  number: z.string(),
  customer_id: z.string(),
  customer_name: z.string(),
  items: z.array(despatchLineSchema),
  delivery_address: z.string(),
  delivery_date: z.string(),
  notes: z.string(),
  status: z.enum(DESPATCH_STATUSES),
  subtotal: z.string(),
  igv: z.string(),
  total: z.string(),
  created_at: z.string(),
})

export type Despatch = z.infer<typeof despatchSchema>

export function emptyDespatch(deliveryDate: string): DespatchInput {
  return { customer_id: '', items: [{ product_id: '', quantity: 1 }], delivery_address: '', delivery_date: deliveryDate, notes: '' }
}

export function toDespatchInput(despatch: Despatch): DespatchInput {
  return {
    customer_id: despatch.customer_id,
    items: despatch.items.map(({ product_id, quantity }) => ({ product_id, quantity })),
    delivery_address: despatch.delivery_address,
    delivery_date: despatch.delivery_date,
    notes: despatch.notes,
  }
}
