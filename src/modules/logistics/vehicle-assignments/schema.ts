import { z } from 'zod'
import type { StatusTone } from '@/shared/components/StatusBadge'
import { textSchema } from '@/shared/lib/schemas'

export const VEHICLE_ASSIGNMENT_STATUSES = ['draft', 'assigned', 'in_use', 'completed'] as const
export type VehicleAssignmentStatus = (typeof VEHICLE_ASSIGNMENT_STATUSES)[number]

export const VEHICLE_ASSIGNMENT_TRANSITIONS: Record<VehicleAssignmentStatus, VehicleAssignmentStatus[]> = {
  draft: ['assigned'],
  assigned: ['in_use', 'completed'],
  in_use: ['completed'],
  completed: [],
}

export const VEHICLE_ASSIGNMENT_STATUS_LABELS: Record<VehicleAssignmentStatus, string> = {
  draft: 'Borrador',
  assigned: 'Asignada',
  in_use: 'En uso',
  completed: 'Completada',
}

export const VEHICLE_ASSIGNMENT_STATUS_TONES: Record<VehicleAssignmentStatus, StatusTone> = {
  draft: 'neutral',
  assigned: 'warning',
  in_use: 'warning',
  completed: 'success',
}

export function canTransitionVehicleAssignment(from: VehicleAssignmentStatus, to: VehicleAssignmentStatus): boolean {
  return VEHICLE_ASSIGNMENT_TRANSITIONS[from].includes(to)
}

export const vehicleAssignmentInputSchema = z.object({
  route_id: textSchema('Ingresa la ruta asignada').uuid('La ruta debe ser válida'),
  vehicle_id: textSchema('Ingresa la unidad de transporte').uuid('La unidad de transporte debe ser válida'),
  driver_id: textSchema('Ingresa el conductor asignado').uuid('El conductor debe ser válido'),
  status: z.enum(VEHICLE_ASSIGNMENT_STATUSES),
  final_odo: textSchema('Ingresa el odométro al final').regex(/^\d+(\.\d+)?$/, 'Ingresa un valor numérico válido'),
  notes: textSchema('Ingresa notas del vehículo').max(1000, 'Las notas no pueden superar los 1000 caracteres'),
})

export type VehicleAssignmentInput = z.infer<typeof vehicleAssignmentInputSchema>

export const vehicleAssignmentSchema = z.object({
  id: z.string(),
  number: z.string(),
  route_id: z.string(),
  route_number: z.string(),
  vehicle_id: z.string(),
  vehicle_plate: z.string(),
  driver_id: z.string(),
  driver_name: z.string(),
  status: z.enum(VEHICLE_ASSIGNMENT_STATUSES),
  final_odo: z.string(),
  notes: z.string(),
  created_at: z.string(),
})

export type VehicleAssignment = z.infer<typeof vehicleAssignmentSchema>

export function emptyVehicleAssignment(): VehicleAssignmentInput {
  return { route_id: '', vehicle_id: '', driver_id: '', status: 'draft', final_odo: '0', notes: '' }
}
