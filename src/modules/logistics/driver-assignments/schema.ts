import { z } from 'zod'
import type { StatusTone } from '@/shared/components/StatusBadge'
import { textSchema } from '@/shared/lib/schemas'

export const DRIVER_ASSIGNMENT_STATUSES = ['draft', 'assigned', 'in_progress', 'completed'] as const
export type DriverAssignmentStatus = (typeof DRIVER_ASSIGNMENT_STATUSES)[number]

export const DRIVER_ASSIGNMENT_TRANSITIONS: Record<DriverAssignmentStatus, DriverAssignmentStatus[]> = {
  draft: ['assigned'],
  assigned: ['in_progress', 'completed'],
  in_progress: ['completed'],
  completed: [],
}

export const DRIVER_ASSIGNMENT_STATUS_LABELS: Record<DriverAssignmentStatus, string> = {
  draft: 'Borrador',
  assigned: 'Asignada',
  in_progress: 'En curso',
  completed: 'Completada',
}

export const DRIVER_ASSIGNMENT_STATUS_TONES: Record<DriverAssignmentStatus, StatusTone> = {
  draft: 'neutral',
  assigned: 'warning',
  in_progress: 'warning',
  completed: 'success',
}

export function canTransitionDriverAssignment(from: DriverAssignmentStatus, to: DriverAssignmentStatus): boolean {
  return DRIVER_ASSIGNMENT_TRANSITIONS[from].includes(to)
}

export const driverAssignmentInputSchema = z.object({
  route_id: textSchema('Ingresa la ruta asignada').uuid('La ruta debe ser válida'),
  driver_id: textSchema('Ingresa el conductor asignado').uuid('El conductor debe ser válido'),
  status: z.enum(DRIVER_ASSIGNMENT_STATUSES),
  assigned_by: textSchema('Ingresa el responsable que asigna la conducción').max(120, 'El nombre no puede superar los 120 caracteres'),
  notes: textSchema('Ingresa notas de la asignación').max(1000, 'Las notas no pueden superar los 1000 caracteres'),
})

export type DriverAssignmentInput = z.infer<typeof driverAssignmentInputSchema>

export const driverAssignmentSchema = z.object({
  id: z.string(),
  number: z.string(),
  route_id: z.string(),
  route_number: z.string(),
  driver_id: z.string(),
  driver_name: z.string(),
  driver_plate: z.string(),
  status: z.enum(DRIVER_ASSIGNMENT_STATUSES),
  assigned_by: z.string(),
  notes: z.string(),
  created_at: z.string(),
})

export type DriverAssignment = z.infer<typeof driverAssignmentSchema>

export function emptyDriverAssignment(): DriverAssignmentInput {
  return { route_id: '', driver_id: '', status: 'draft', assigned_by: '', notes: '' }
}
