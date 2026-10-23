import { z } from 'zod'
import type { StatusTone } from '@/shared/components/StatusBadge'
import { noteSchema, businessDateSchema } from '@/shared/lib/schemas'

export const DELIVERY_CONFIRMATION_STATUSES = ['pending', 'confirmed', 'failed', 'returned'] as const
export type DeliveryConfirmationStatus = (typeof DELIVERY_CONFIRMATION_STATUSES)[number]

export const DELIVERY_CONFIRMATION_TRANSITIONS: Record<DeliveryConfirmationStatus, DeliveryConfirmationStatus[]> = {
  pending: ['confirmed', 'failed', 'returned'],
  confirmed: [],
  failed: ['pending', 'returned'],
  returned: ['pending'],
}

export const DELIVERY_CONFIRMATION_STATUS_LABELS: Record<DeliveryConfirmationStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  failed: 'Fallida',
  returned: 'Retorno',
}

export const DELIVERY_CONFIRMATION_STATUS_TONES: Record<DeliveryConfirmationStatus, StatusTone> = {
  pending: 'neutral',
  confirmed: 'success',
  failed: 'danger',
  returned: 'warning',
}

export function canTransitionDeliveryConfirmation(from: DeliveryConfirmationStatus, to: DeliveryConfirmationStatus): boolean {
  return DELIVERY_CONFIRMATION_TRANSITIONS[from].includes(to)
}

export const deliveryConfirmationInputSchema = z.object({
  route_id: z.string().uuid('La ruta debe ser válida'),
  dispatch_id: z.string().uuid('El despacho debe ser válido'),
  confirmation_code: noteSchema('Ingresa el código de confirmación').max(40, 'El código no puede superar los 40 caracteres'),
  customer_signature: noteSchema('Ingresa la firma del cliente').max(200, 'La firma no puede superar los 200 caracteres'),
  status: z.enum(DELIVERY_CONFIRMATION_STATUSES),
  note: noteSchema('Ingresa una nota sobre el resultado de la entrega'),
  delivered_at: businessDateSchema('Ingresa la fecha de entrega').max(10, 'La fecha no es válida'),
})

export type DeliveryConfirmationInput = z.infer<typeof deliveryConfirmationInputSchema>

export const deliveryConfirmationSchema = z.object({
  id: z.string(),
  number: z.string(),
  route_id: z.string(),
  route_number: z.string(),
  dispatch_id: z.string(),
  dispatch_number: z.string(),
  customer_name: z.string(),
  confirmation_code: z.string(),
  customer_signature: z.string(),
  status: z.enum(DELIVERY_CONFIRMATION_STATUSES),
  note: z.string(),
  delivered_at: z.string(),
  created_at: z.string(),
})

export type DeliveryConfirmation = z.infer<typeof deliveryConfirmationSchema>

export function emptyDeliveryConfirmation(): DeliveryConfirmationInput {
  return { route_id: '', dispatch_id: '', confirmation_code: '', customer_signature: '', status: 'pending', note: '', delivered_at: '' }
}


