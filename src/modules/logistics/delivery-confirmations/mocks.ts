import { createDocumentHandlers, nextNumber } from '@/mocks/utils/documents'
import { deliveryConfirmationInputSchema } from './schema'
import type { DeliveryConfirmation, DeliveryConfirmationInput } from './schema'

const uuid = (n: number) => '00000000-0000-4000-8068-' + String(n).padStart(12, '0')
const deliveryConfirmationId = (n: number) => uuid(n)

const deliveryConfirmationSeed: DeliveryConfirmation[] = [
  {
    id: deliveryConfirmationId(1),
    number: 'DCN-000001',
    route_id: '00000000-0000-4000-8063-000000000001',
    route_number: 'RUT-000001',
    dispatch_id: '00000000-0000-4000-8060-000000000001',
    dispatch_number: 'DSP-000001',
    customer_name: 'Comercial Andina S.A.C.',
    confirmation_code: 'CONF-2026-000001',
    customer_signature: 'JUAN PÉREZ',
    status: 'confirmed',
    note: 'Entrega realizada a las 10:00.',
    delivered_at: '2026-10-25',
    created_at: '2026-10-24T10:00:00Z',
  },
  {
    id: deliveryConfirmationId(2),
    number: 'DCN-000002',
    route_id: '00000000-0000-4000-8063-000000000002',
    route_number: 'RUT-000002',
    dispatch_id: '00000000-0000-4000-8060-000000000002',
    dispatch_number: 'DSP-000002',
    customer_name: 'Distribuidora Pacífico S.R.L.',
    confirmation_code: 'CONF-2026-000002',
    customer_signature: 'MARIA GARCIA',
    status: 'returned',
    note: 'Mercancía devuelta por el cliente.',
    delivered_at: '2026-10-26',
    created_at: '2026-10-25T09:00:00Z',
  },
]

export const deliveryConfirmationHandlers = createDocumentHandlers<DeliveryConfirmation, DeliveryConfirmationInput, DeliveryConfirmation['status']>({
  resource: 'logistics/delivery-confirmations',
  seed: deliveryConfirmationSeed,
  searchFields: ['number', 'route_number', 'dispatch_number', 'customer_name', 'confirmation_code'],
  filterFields: ['status'],
  dateField: 'created_at',
  inputSchema: deliveryConfirmationInputSchema,
  createRecord: (input, id, created_at) => {
    return {
      ...input,
      id,
      number: nextNumber('DCN', 3),
      status: 'pending',
      created_at,
      route_number: '',
      dispatch_number: '',
      customer_name: '',
    } as DeliveryConfirmation
  },
  updateRecord: (current, input) => {
    return {
      ...current,
      ...input,
      route_number: current.route_number,
      dispatch_number: current.dispatch_number,
      customer_name: current.customer_name,
    } as DeliveryConfirmation
  },
  actions: [
    {
      action: 'confirm',
      from: ['pending'],
      to: 'confirmed',
      check: () => undefined,
      respond: (deliveryConfirmation) => deliveryConfirmation,
    },
    {
      action: 'fail',
      from: ['pending'],
      to: 'failed',
      check: () => undefined,
      respond: (deliveryConfirmation) => deliveryConfirmation,
    },
    {
      action: 'return',
      from: ['failed', 'returned'],
      to: 'returned',
      check: () => undefined,
      respond: (deliveryConfirmation) => deliveryConfirmation,
    },
  ],
})

export const currentDeliveryConfirmations = () => deliveryConfirmationSeed
