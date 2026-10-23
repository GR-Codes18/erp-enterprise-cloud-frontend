import { z } from 'zod'
import type { StatusTone } from '@/shared/components/StatusBadge'


export const ROUTE_STATUSES = ['draft', 'scheduled', 'in_progress', 'completed'] as const
export type RouteStatus = (typeof ROUTE_STATUSES)[number]

export const ROUTE_TRANSITIONS: Record<RouteStatus, RouteStatus[]> = {
  draft: ['scheduled'],
  scheduled: ['in_progress', 'completed'],
  in_progress: ['completed'],
  completed: [],
}

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  in_progress: 'En curso',
  completed: 'Completada',
}

export const ROUTE_STATUS_TONES: Record<RouteStatus, StatusTone> = {
  draft: 'neutral',
  scheduled: 'warning',
  in_progress: 'warning',
  completed: 'success',
}

export function canTransitionRoute(from: RouteStatus, to: RouteStatus): boolean {
  return ROUTE_TRANSITIONS[from].includes(to)
}

export const routeInputSchema = z.object({
  name: z.string().max(120, 'El nombre no puede superar los 120 caracteres'),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ingresa una fecha de inicio válida'),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ingresa una fecha de finalización válida'),
  status: z.enum(ROUTE_STATUSES),
  despatch_ids: z.array(z.string().uuid('El ID del despacho debe ser válido')),
  notes: z.string().max(1000, 'Las notas no pueden superar los 1000 caracteres'),
})

export type RouteInput = z.infer<typeof routeInputSchema>

export const routeSchema = z.object({
  id: z.string(),
  number: z.string(),
  name: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.enum(ROUTE_STATUSES),
  despatch_ids: z.array(z.string().uuid('El ID del despacho debe ser válido')),
  despatches: z.array(z.object({
    id: z.string(),
    number: z.string(),
    customer_name: z.string(),
  })),
  notes: z.string(),
  total_cost: z.string(),
  created_at: z.string(),
})

export type Route = z.infer<typeof routeSchema>

export function emptyRoute(): RouteInput {
  return { name: '', start_date: '', end_date: '', status: 'draft', despatch_ids: [], notes: '' }
}
