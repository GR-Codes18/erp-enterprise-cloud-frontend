import { createDocumentHandlers, nextNumber } from '@/mocks/utils/documents'
import { routeInputSchema, type Route, type RouteInput } from './schema'

const uuid = (n: number) => '00000000-0000-4000-8063-' + String(n).padStart(12, '0')
const routeId = (n: number) => uuid(n)

const routeSeed: Route[] = [
  {
    id: routeId(1),
    number: 'RUT-000001',
    name: 'Ruta Sur Línea 01',
    start_date: '2026-10-24',
    end_date: '2026-10-25',
    status: 'scheduled',
    despatch_ids: ['00000000-0000-4000-8060-000000000001', '00000000-0000-4000-8060-000000000002'],
    despatches: [
      { id: '00000000-0000-4000-8060-000000000001', number: 'DSP-000001', customer_name: 'Comercial Andina S.A.C.' },
      { id: '00000000-0000-4000-8060-000000000002', number: 'DSP-000002', customer_name: 'Distribuidora Pacífico S.R.L.' },
    ],
    notes: 'Ruta principal para el sur de Lima.',
    total_cost: '0.00',
    created_at: '2026-10-22T09:00:00Z',
  },
  {
    id: routeId(2),
    number: 'RUT-000002',
    name: 'Ruta Norte Línea 02',
    start_date: '2026-10-26',
    end_date: '2026-10-27',
    status: 'scheduled',
    despatch_ids: [],
    despatches: [],
    notes: 'Ruta de cobertura para el norte metropolitano.',
    total_cost: '0.00',
    created_at: '2026-10-22T10:00:00Z',
  },
]

export const routeHandlers = createDocumentHandlers<Route, RouteInput, Route['status']>({
  resource: 'logistics/routes',
  seed: routeSeed,
  searchFields: ['number', 'name', 'despatch_ids'],
  filterFields: ['status'],
  dateField: 'created_at',
  inputSchema: routeInputSchema,
  createRecord: (input, id, created_at) => ({
    ...input,
    id,
    number: nextNumber('RUT', 3),
    status: 'draft',
    created_at,
    total_cost: '0.00',
    despatches: [],
  }),
  updateRecord: (current, input) => ({
    ...current,
    ...input,
    total_cost: '0.00',
  }),
  actions: [
    {
      action: 'schedule',
      from: ['draft'],
      to: 'scheduled',
      check: () => undefined,
      respond: (route) => route,
    },
    {
      action: 'complete',
      from: ['scheduled', 'in_progress'],
      to: 'completed',
      check: () => undefined,
      respond: (route) => route,
    },
  ],
})

export const currentRoutes = () => routeSeed
