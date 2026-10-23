import { z } from 'zod'
import type { StatusTone } from '@/shared/components/StatusBadge'
import { noteSchema, textSchema } from '@/shared/lib/schemas'

export const TRACKING_STATUSES = ['pending', 'in_progress', 'completed', 'delivered'] as const
export type TrackingStatus = (typeof TRACKING_STATUSES)[number]

export const TRACKING_TRANSITIONS: Record<TrackingStatus, TrackingStatus[]> = {
  pending: ['in_progress', 'completed'],
  in_progress: ['completed', 'delivered'],
  completed: ['delivered'],
  delivered: [],
}

export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
  delivered: 'Entregada',
}

export const TRACKING_STATUS_TONES: Record<TrackingStatus, StatusTone> = {
  pending: 'neutral',
  in_progress: 'warning',
  completed: 'warning',
  delivered: 'success',
}

export function canTransitionTracking(from: TrackingStatus, to: TrackingStatus): boolean {
  return TRACKING_TRANSITIONS[from].includes(to)
}

export const trackingInputSchema = z.object({
  route_id: textSchema('Ingresa la ruta del seguimiento').uuid('La ruta debe ser válida'),
  dispatch_id: textSchema('Ingresa el despacho que se sigue').uuid('El despacho debe ser válido'),
  progress: textSchema('Ingresa el avance porcentual').regex(/^\d+(\.\d+)?$/, 'El avance debe ser un porcentaje entre 0 y 100').max(100, 'El avance no puede superar el 100%'),
  note: noteSchema('Ingresa una observación del avance'),
  status: z.enum(TRACKING_STATUSES),
  milestone: textSchema('Ingresa la fecha de hito').max(10, 'La fecha del hito no es válida'),
  last_update: textSchema('Ingresa la fecha de la última actualización').max(10, 'La fecha no es válida'),
})

export type TrackingInput = z.infer<typeof trackingInputSchema>

export const trackingSchema = z.object({
  id: z.string(),
  number: z.string(),
  route_id: z.string(),
  route_number: z.string(),
  dispatch_id: z.string(),
  dispatch_number: z.string(),
  customer_name: z.string(),
  progress: z.string(),
  note: z.string(),
  status: z.enum(TRACKING_STATUSES),
  milestone: z.string(),
  last_update: z.string(),
  created_at: z.string(),
})

export type Tracking = z.infer<typeof trackingSchema>

export function emptyTracking(): TrackingInput {
  return { route_id: '', dispatch_id: '', progress: '0', note: '', status: 'pending', milestone: '', last_update: '' }
}
