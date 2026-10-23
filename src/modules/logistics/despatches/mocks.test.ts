import { beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { despatchHandlers } from './mocks'

const API = '/logistics/despatches'
const id = (n: number) => '00000000-0000-4000-8060-' + String(n).padStart(12, '0')

describe('mocks de planificación de despachos', () => {
  const server = setupServer(...despatchHandlers.handlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('mantiene las listas de datos semilla', async () => {
    const result = await (await fetch(API + '?size=50')).json()
    expect(result.total).toBe(2)
  })

  it('crea un despacho en borrador y lo planifica', async () => {
    const draft = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: id(1),
        items: [
          { product_id: id(1), quantity: 2 },
          { product_id: id(2), quantity: 1 },
        ],
        delivery_address: 'Av. Siempre Viva 742',
        delivery_date: '2026-10-26',
        notes: 'Entregar a la mañana.',
      }),
    })
    expect(draft.status).toBe(201)
    const created = await draft.json()
    expect(created.status).toBe('draft')
    expect(created.number).toBe('DSP-000003')

    const planned = await fetch(API + '/' + created.id + '/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(planned.status).toBe(200)
    expect((await planned.json()).status).toBe('planned')
  })
})
