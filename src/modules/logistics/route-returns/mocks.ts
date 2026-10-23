import { createDocumentHandlers, nextNumber } from '@/mocks/utils/documents'
import { routeReturnInputSchema, type RouteReturn, type RouteReturnInput } from './schema'

const uuid = (n: number) => '00000000-0000-4000-8069-' + String(n).padStart(12, '0')
const routeReturnId = (n: number) => uuid(n)

const routeReturnSeed: RouteReturn[] = [
  {
    id: routeReturnId(1),
    number: 'RTR-000001',
    route_id: '00000000-0000-4000-8063-000000000001',
    route_number: 'RUT-000001',
    dispatch_id: '00000000-0000-4000-8060-000000000001',
    dispatch_number: 'DSP-000001',
    customer_name: 'Comercial Andina S.A.C.',
    type: 'crane',
    customer_signature: 'CARLOS RUIZ',
    reason: 'Configuración errónea.',
    status: 'initiated',
    note: 'Devolución parcial de equipos crane.',
    returned_at: '2026-10-25',
    created_at: '2026-10-24T16:00:00Z',
  },
  {
    id: routeReturnId(2),
    number: 'RTR-000002',
    route_id: '00000000-0000-4000-8063-000000000002',
    route_number: 'RUT-000002',
    dispatch_id: '00000000-0000-4000-8060-000000000002',
    dispatch_number: 'DSP-000002',
    customer_name: 'Distribuidora Pacífico S.R.L.',
    type: 'whole',
    customer_signature: 'MARIA GARCIA',
    reason: 'Producto no disponible.',
    status: 'confirmed',
    note: 'Todo el contenido devuelto.',
    returned_at: '2026-10-26',
    created_at: '2026-10-25T09:00:00Z',
  },
]

export const routeReturnHandlers = createDocumentHandlers<RouteReturn, RouteReturnInput, RouteReturn['status']>({
  resource: 'logistics/route-returns',
  seed: routeReturnSeed,
  searchFields: ['number', 'route_number', 'dispatch_number', 'customer_name', 'reason'],
  filterFields: ['status'],
  dateField: 'created_at',
  inputSchema: routeReturnInputSchema,
  createRecord: (input, id, created_at) => ({
    ...input,
    id,
    number: nextNumber('RTR', 3),
    type: input.type,
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
      action: 'initiate',
      from: ['pending'],
      to: 'initiated',
      check: () => undefined,
      respond: (routeReturn) => routeReturn,
    },
    {
      action: 'confirm',
      from: ['initiated', 'confirmed'],
      to: 'confirmed',
      check: () => undefined,
      respond: (routeReturn) => routeReturn,
    },
  ],
})

export const currentRouteReturns = () => routeReturnSeed
