import { createDocumentHandlers, nextNumber } from '@/mocks/utils/documents'
import { driverAssignmentInputSchema, type DriverAssignment, type DriverAssignmentInput } from './schema'

const uuid = (n: number) => '00000000-0000-4000-8066-' + String(n).padStart(12, '0')
const driverAssignmentId = (n: number) => uuid(n)

const driverAssignmentSeed: DriverAssignment[] = [
  {
    id: driverAssignmentId(1),
    number: 'DRA-000001',
    route_id: '00000000-0000-4000-8063-000000000001',
    route_number: 'RUT-000001',
    driver_id: '00000000-0000-4000-8066-000000000001',
    driver_name: 'Carlos Ruiz',
    driver_plate: 'C-1234',
    status: 'assigned',
    assigned_by: 'Soporte Logística',
    notes: 'Conductor principal para la ruta sur.',
    created_at: '2026-10-20T09:00:00Z',
  },
  {
    id: driverAssignmentId(2),
    number: 'DRA-000002',
    route_id: '00000000-0000-4000-8063-000000000002',
    route_number: 'RUT-000002',
    driver_id: '00000000-0000-4000-8066-000000000002',
    driver_name: 'Ana López',
    driver_plate: 'A-5678',
    status: 'in_progress',
    assigned_by: 'Jorge Herrera',
    notes: 'Asignado a la ruta norte en curso.',
    created_at: '2026-10-19T09:00:00Z',
  },
]

export const driverAssignmentHandlers = createDocumentHandlers<DriverAssignment, DriverAssignmentInput, DriverAssignment['status']>({
  resource: 'logistics/driver-assignments',
  seed: driverAssignmentSeed,
  searchFields: ['number', 'route_number', 'driver_name', 'assigned_by'],
  filterFields: ['status'],
  dateField: 'created_at',
  inputSchema: driverAssignmentInputSchema,
  createRecord: (input, id, created_at) => ({
    ...input,
    id,
    number: nextNumber('DRA', 3),
    status: 'draft',
    created_at,
    driver_name: '',
    driver_plate: '',
    route_number: '',
  }),
  updateRecord: (current, input) => ({
    ...current,
    ...input,
    driver_name: current.driver_name,
    driver_plate: current.driver_plate,
    route_number: current.route_number,
    assigned_by: current.assigned_by,
  }),
  actions: [
    {
      action: 'start',
      from: ['assigned'],
      to: 'in_progress',
      check: () => undefined,
      respond: (driverAssignment) => driverAssignment,
    },
    {
      action: 'finish',
      from: ['assigned', 'in_progress'],
      to: 'completed',
      check: () => undefined,
      respond: (driverAssignment) => driverAssignment,
    },
  ],
})

export const currentDriverAssignments = () => driverAssignmentSeed
