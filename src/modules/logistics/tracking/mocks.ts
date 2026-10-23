import { createDocumentHandlers, nextNumber } from '@/mocks/utils/documents'
import { trackingInputSchema, type Tracking, type TrackingInput } from './schema'

const uuid = (n: number) => '00000000-0000-4000-8067-' + String(n).padStart(12, '0')
const trackingId = (n: number) => uuid(n)

const trackingSeed: Tracking[] = [
  {
    id: trackingId(1),
    number: 'TRK-000001',
    route_id: '00000000-0000-4000-8063-000000000001',
    route_number: 'RUT-000001',
    dispatch_id: '00000000-0000-4000-8060-000000000001',
    dispatch_number: 'DSP-000001',
    customer_name: 'Comercial Andina S.A.C.',
    progress: '50',
    note: 'Pase por la zona industrial del Callao.',
    status: 'in_progress',
    milestone: '2026-10-25',
    last_update: '2026-10-24T15:30:00Z',
    created_at: '2026-10-23T09:00:00Z',
  },
  {
    id: trackingId(2),
    number: 'TRK-000002',
    route_id: '00000000-0000-4000-8063-000000000002',
    route_number: 'RUT-000002',
    dispatch_id: '00000000-0000-4000-8060-000000000002',
    dispatch_number: 'DSP-000002',
    customer_name: 'Distribuidora Pacífico S.R.L.',
    progress: '25',
    note: 'Recolectando mercancía en el almacén central.',
    status: 'pending',
    milestone: '2026-10-26',
    last_update: '2026-10-23T08:15:00Z',
    created_at: '2026-10-23T08:15:00Z',
  },
]

export const trackingHandlers = createDocumentHandlers<Tracking, TrackingInput, Tracking['status']>({
  resource: 'logistics/tracking',
  seed: trackingSeed,
  searchFields: ['number', 'route_number', 'dispatch_number', 'customer_name', 'note'],
  filterFields: ['status'],
  dateField: 'created_at',
  inputSchema: trackingInputSchema,
  createRecord: (input, id, created_at) => ({
    ...input,
    id,
    number: nextNumber('TRK', 3),
    status: 'pending',
    created_at,
    route_number: '',
    dispatch_number: '',
    customer_name: '',
  }),
  updateRecord: (current, input) => ({
    ...current,
    ...input,
    route_number: current.route_number,
    dispatch_number: current.dispatch_number,
    customer_name: current.customer_name,
  }),
  actions: [
    {
      action: 'start',
      from: ['pending'],
      to: 'in_progress',
      check: () => undefined,
      respond: (tracking) => tracking,
    },
    {
      action: 'complete',
      from: ['in_progress'],
      to: 'completed',
      check: () => undefined,
      respond: (tracking) => tracking,
    },
    {
      action: 'deliver',
      from: ['completed'],
      to: 'delivered',
      check: () => undefined,
      respond: (tracking) => tracking,
    },
  ],
})

export const currentTrackings = () => trackingSeed
