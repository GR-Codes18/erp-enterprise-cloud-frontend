import { beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { routeCostHandlers } from './mocks'

const API = '/logistics/route-costs'
const id = (n: number) => '00000000-0000-4000-806a-' + String(n).padStart(12, '0')

describe('mocks de costos y liquidación de ruta', () => {
  const server = setupServer(...routeCostHandlers.handlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('mantiene las listas de datos semilla', async () => {
    const result = await (await fetch(API + '?size=50')).json()
    expect(result.total).toBe(2)
  })

  it('crea un costo de ruta y lo aprueba', async () => {
    const draft = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: id(1),
        description: 'Combustible para la ruta sur.',
        category: 'Combustible',
        amount_cents: '250.00',
        paid_by: 'Jorge Herrera',
      }),
    })
    expect(draft.status).toBe(201)
    const created = await draft.json()
    expect(created.status).toBe('draft')
    expect(created.number).toBe('RCT-000003')

    const approved = await fetch(API + '/' + created.id + '/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(approved.status).toBe(200)
    expect((await approved.json()).status).toBe('approved')
  })
})
