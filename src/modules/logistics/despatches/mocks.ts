import { createDocumentHandlers, nextNumber } from '@/mocks/utils/documents'
import { despatchInputSchema, type Despatch, type DespatchInput } from './schema'

const uuid = (n: number) => '00000000-0000-4000-8060-' + String(n).padStart(12, '0')
const despatchId = (n: number) => uuid(n)

const despatchSeed: Despatch[] = [
  {
    id: despatchId(1),
    number: 'DSP-000001',
    customer_id: '00000000-0000-4000-8061-000000000001',
    customer_name: 'Comercial Andina S.A.C.',
    items: [
      { product_id: '00000000-0000-4000-8062-000000000001', product_name: 'Martillo de Peña 16oz', quantity: 10 },
      { product_id: '00000000-0000-4000-8062-000000000003', product_name: 'Cemento Portland Tipo I 42.5kg', quantity: 50 },
    ],
    delivery_address: 'Av. Principal 123, Lima Centro',
    delivery_date: '2026-10-25',
    notes: 'Entregar antes de las 14:00.',
    status: 'planned',
    subtotal: '1450.00',
    igv: '289.50',
    total: '1739.50',
    created_at: '2026-10-20T09:00:00Z',
  },
  {
    id: despatchId(2),
    number: 'DSP-000002',
    customer_id: '00000000-0000-4000-8061-000000000002',
    customer_name: 'Distribuidora Pacífico S.R.L.',
    items: [
      { product_id: '00000000-0000-4000-8062-000000000004', product_name: 'Ladrillo Klinker 18 Huecos', quantity: 800 },
      { product_id: '00000000-0000-4000-8062-000000000008', product_name: 'Tubo PVC Presión 1/2 pulg x 5m', quantity: 30 },
    ],
    delivery_address: 'Jr. Industrial 456, Callao',
    delivery_date: '2026-10-28',
    notes: '',
    status: 'planned',
    subtotal: '2340.00',
    igv: '468.00',
    total: '2808.00',
    created_at: '2026-10-21T09:00:00Z',
  },
]

export const despatchHandlers = createDocumentHandlers<Despatch, DespatchInput, Despatch['status']>({
  resource: 'logistics/despatches',
  seed: despatchSeed,
  searchFields: ['number', 'customer_name', 'delivery_address'],
  filterFields: ['status'],
  dateField: 'created_at',
  inputSchema: despatchInputSchema,
  createRecord: (input, id, created_at) => ({
    ...input,
    id,
    number: nextNumber('DSP', 3),
    customer_name: '',
    status: 'draft',
    created_at,
    items: input.items.map((item) => ({ ...item, product_name: '' })),
    subtotal: '0.00',
    igv: '0.00',
    total: '0.00',
  }),
  updateRecord: (current, input) => ({
    ...current,
    ...input,
    customer_name: current.customer_name,
    items: current.items.map((item) => ({ ...item, product_name: item.product_name })),
    subtotal: '0.00',
    igv: '0.00',
    total: '0.00',
  }),
  actions: [
    {
      action: 'plan',
      from: ['draft'],
      to: 'planned',
      check: () => undefined,
      respond: (despatch) => despatch,
    },
  ],
})

export const currentDespatches = () => despatchSeed
