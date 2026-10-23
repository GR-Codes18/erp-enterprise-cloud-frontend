import { z } from 'zod'
import type { StatusTone } from '@/shared/components/StatusBadge'
import { noteSchema } from '@/shared/lib/schemas'
import { moneyParser } from '@/shared/lib/money'

export const ROUTE_COST_STATUSES = ['draft', 'estimated', 'approved', 'liquidated'] as const
export type RouteCostStatus = (typeof ROUTE_COST_STATUSES)[number]

export const ROUTE_COST_TRANSITIONS: Record<RouteCostStatus, RouteCostStatus[]> = {
  draft: ['estimated'],
  estimated: ['approved', 'liquidated'],
  approved: ['liquidated'],
  liquidated: [],
}

export const ROUTE_COST_STATUS_LABELS: Record<RouteCostStatus, string> = {
  draft: 'Borrador',
  estimated: 'Estimada',
  approved: 'Aprobada',
  liquidated: 'Liquidada',
}

export const ROUTE_COST_STATUS_TONES: Record<RouteCostStatus, StatusTone> = {
  draft: 'neutral',
  estimated: 'warning',
  approved: 'warning',
  liquidated: 'success',
}

export function canTransitionRouteCost(from: RouteCostStatus, to: RouteCostStatus): boolean {
  return ROUTE_COST_TRANSITIONS[from].includes(to)
}

export const routeCostInputSchema = z.object({
  route_id: z.string().uuid('La ruta debe ser válida'),
  description: noteSchema('Ingresa una descripción del gasto').max(120, 'La descripción no puede superar los 120 caracteres'),
  category: noteSchema('Ingresa la categoría del gasto').max(80, 'La categoría no puede superar los 80 caracteres'),
  amount_cents: moneyParser('Ingresa un monto válido'),
  paid_by: noteSchema('Ingresa quién pagó el gasto').max(120, 'El nombre no puede superar los 120 caracteres'),
  status: z.enum(ROUTE_COST_STATUSES),
  note: noteSchema('Ingresa notas del gasto'),
})

export type RouteCostInput = z.infer<typeof routeCostInputSchema>

export const routeCostSchema = z.object({
  id: z.string(),
  number: z.string(),
  route_id: z.string(),
  route_number: z.string(),
  description: z.string(),
  category: z.string(),
  amount_cents: z.string(),
  paid_by: z.string(),
  status: z.enum(ROUTE_COST_STATUSES),
  note: z.string(),
  created_at: z.string(),
})

export type RouteCost = z.infer<typeof routeCostSchema>

export function emptyRouteCost(): RouteCostInput {
  return { route_id: '', description: '', category: '', amount_cents: '0.00', paid_by: '', status: 'draft', note: '' }
}

