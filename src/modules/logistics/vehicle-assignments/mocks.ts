import { createDocumentHandlers, nextNumber } from '@/mocks/utils/documents'
import { vehicleAssignmentInputSchema, type VehicleAssignment, type VehicleAssignmentInput } from './schema'

const uuid = (n: number) => '00000000-0000-4000-8064-' + String(n).padStart(12, '0')
const vehicleAssignmentId = (n: number) => uuid(n)

const vehicleAssignmentSeed: VehicleAssignment[] = [
  {
    id: vehicleAssignmentId(1),
    number: 'VMA-000001',
    route_id: '00000000-0000-4000-8063-000000000001',
    route_number: 'RUT-000001',
    vehicle_id: '00000000-0000-4000-8065-000000000001',
    vehicle_plate: 'AB-1234',
    driver_id: '00000000-0000-4000-8066-000000000001',
    driver_name: 'Carlos Ruiz',
    status: 'assigned',
    final_odo: '45231.20',
    notes: 'Vehículo listo para la ruta.',
    created_at: '2026-10-20T09:00:00Z',
  },
  {
    id: vehicleAssignmentId(2),
    number: 'VMA-000002',
    route_id: '00000000-0000-4000-8063-000000000002',
    route_number: 'RUT-000002',
    vehicle_id: '00000000-0000-4000-8065-000000000002',
    vehicle_plate: 'CD-5678',
    driver_id: '00000000-0000-4000-8066-000000000002',
    driver_name: 'Ana López',
    status: 'in_use',
    final_odo: '67890.00',
    notes: 'En curso en la ruta norte.',
    created_at: '2026-10-19T09:00:00Z',
  },
]

export const vehicleAssignmentHandlers = createDocumentHandlers<VehicleAssignment, VehicleAssignmentInput, VehicleAssignment['status']>({
  resource: 'logistics/vehicle-assignments',
  seed: vehicleAssignmentSeed,
  searchFields: ['number', 'route_number', 'vehicle_plate', 'driver_name'],
  filterFields: ['status'],
  dateField: 'created_at',
  inputSchema: vehicleAssignmentInputSchema,
  createRecord: (input, id, created_at) => ({
    ...input,
    id,
    number: nextNumber('VMA', 3),
    status: 'draft',
    created_at,
    route_number: '',
    vehicle_plate: '',
    driver_name: '',
    final_odo: '0.00',
  }),
  updateRecord: (current, input) => ({
    ...current,
    ...input,
    final_odo: current.final_odo,
    vehicle_plate: current.vehicle_plate,
    driver_name: current.driver_name,
    status: current.status,
  }),
  actions: [
    {
      action: 'start',
      from: ['assigned'],
      to: 'in_use',
      check: () => undefined,
      respond: (vehicleAssignment) => vehicleAssignment,
    },
    {
      action: 'finish',
      from: ['assigned', 'in_use'],
      to: 'completed',
      check: () => undefined,
      respond: (vehicleAssignment) => vehicleAssignment,
    },
  ],
})

export const currentVehicleAssignments = () => vehicleAssignmentSeed
