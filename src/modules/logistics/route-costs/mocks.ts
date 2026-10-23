import { createDocumentHandlers, nextNumber } from '@/mocks/utils/documents'
import { routeCostInputSchema, type RouteCost, type RouteCostInput } from './schema'

const uuid = (n: number) => '00000000-0000-4000-806a-' + String(n).padStart(12, '0')
const routeCostId = (n: number) => uuid(n)

const routeCostSeed: RouteCost[] = [
  {
    id: routeCostId(1),
    number: 'RCT-000001',
    route_id: '00000000-0000-4000-8063-000000000001',
    route_number: 'RUT-000001',
    description: 'Combustible para la ruta sur.',
    category: 'Combustible',
    amount_cents: '250.00',
    paid_by: 'Jorge Herrera',
    status: 'approved',
    note: 'Gasto de distribución registrado el 24-oct.',
    created_at: '2026-10-23T10:00:00Z',
  },
  {
    id: routeCostId(2),
    number: 'RCT-000002',
    route_id: '00000000-0000-4000-8063-000000000002',
    route_number: 'RUT-000002',
    description: 'Repuestos para la unidad CD-5678.',
    category: 'Repuestos',
    amount_cents: '120.50',
    paid_by: 'Soporte Logística',
    status: 'liquidated',
    note: 'Repuestos adquiridos el 25-oct.',
    created_at: '2026-10-23T11:00:00Z',
  },
]

export const routeCostHandlers = createDocumentHandlers<RouteCost, RouteCostInput, RouteCost['status']>({
  resource: 'logistics/route-costs',
  seed: routeCostSeed,
  searchFields: ['number', 'route_number', 'description', 'category', 'paid_by'],
  filterFields: ['status'],
  dateField: 'created_at',
  inputSchema: routeCostInputSchema,
  createRecord: (input, id, created_at) => ({
    ...input,
    id,
    number: nextNumber('RCT', 3),
    status: 'draft',
    created_at,
    route_number: '',
  }),
  updateRecord: (current, input) => ({
    ...current,
    ...input,
    route_number: current.route_number,
  }),
  actions: [
    {
      action: 'approve',
      from: ['draft', 'estimated'],
      to: 'approved',
      check: () => undefined,
      respond: (routeCost) => routeCost,
    },
    {
      action: 'liquidate',
      from: ['approved'],
      to: 'liquidated',
      check: () => undefined,
      respond: (routeCost) => routeCost,
    },
  ],
})

export const currentRouteCosts = () => routeCostSeed

