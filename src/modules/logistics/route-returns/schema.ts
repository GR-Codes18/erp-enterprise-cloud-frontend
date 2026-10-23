import { z } from 'zod'
import type { StatusTone } from '@/shared/components/StatusBadge'
import { noteSchema, textSchema } from '@/shared/lib/schemas'

export const ROUTE_RETURN_STATUSES = ['pending', 'initiated', 'confirmed'] as const
export type RouteReturnStatus = (typeof ROUTE_RETURN_STATUSES)[number]

export const ROUTE_RETURN_TRANSITIONS: Record<RouteReturnStatus, RouteReturnStatus[]> = {
  pending: ['initiated', 'confirmed'],
  initiated: ['confirmed'],
  confirmed: [],
}

export const ROUTE_RETURN_STATUS_LABELS: Record<RouteReturnStatus, string> = {
  pending: 'Pendiente',
  initiated: 'Iniciada',
  confirmed: 'Confirmada',
}

export const ROUTE_RETURN_STATUS_TONES: Record<RouteReturnStatus, StatusTone> = {
  pending: 'neutral',
  initiated: 'warning',
  confirmed: 'danger',
}

export function canTransitionRouteReturn(from: RouteReturnStatus, to: RouteReturnStatus): boolean {
  return ROUTE_RETURN_TRANSITIONS[from].includes(to)
}

export const routeReturnInputSchema = z.object({
  route_id: textSchema('Ingresa la ruta de la devolución').uuid('La ruta debe ser válida'),
  dispatch_id: textSchema('Ingresa el despacho de la devolución').uuid('El despacho debe ser válido'),
  type: textSchema('Ingresa el tipo de devolución').max(100, 'El tipo no puede superar los 100 caracteres'),
  customer_signature: textSchema('Ingresa la firma del cliente').max(200, 'La firma no puede superar los 200 caracteres'),
  reason: noteSchema('Ingresa la razón de la devolución'),
  status: z.enum(ROUTE_RETURN_STATUSES),
  note: noteSchema('Ingresa notas adicionales de la devolución'),
  returned_at: textSchema('Ingresa la fecha de la devolución').max(10, 'La fecha no es válida'),
})

export type RouteReturnInput = z.infer<typeof routeReturnInputSchema>

export const routeReturnSchema = z.object({
  id: z.string(),
  number: z.string(),
  route_id: z.string(),
  route_number: z.string(),
  dispatch_id: z.string(),
  dispatch_number: z.string(),
  customer_name: z.string(),
  type: z.string(),
  customer_signature: z.string(),
  reason: z.string(),
  status: z.enum(ROUTE_RETURN_STATUSES),
  note: z.string(),
  returned_at: z.string(),
  created_at: z.string(),
})

export type RouteReturn = z.infer<typeof routeReturnSchema>

export function emptyRouteReturn(): RouteReturnInput {
  return { route_id: '', dispatch_id: '', type: '', customer_signature: '', reason: '', status: 'pending', note: '', returned_at: '' }
}
