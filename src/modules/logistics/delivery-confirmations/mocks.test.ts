import { beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { deliveryConfirmationHandlers } from './mocks'

const API = '/logistics/delivery-confirmations'
const id = (n: number) => '00000000-0000-4000-8068-' + String(n).padStart(12, '0')

describe('mocks de confirmación de entregas', () => {
  const server = setupServer(...deliveryConfirmationHandlers.handlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('mantiene las listas de datos semilla', async () => {
    const result = await (await fetch(API + '?size=50')).json()
    expect(result.total).toBe(2)
  })

  it('crea una confirmación y la avanza al estado confirmada', async () => {
    const draft = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: id(1),
        dispatch_id: id(1),
        confirmation_code: 'CONF-2026-000003',
        customer_signature: 'CARLOS RUIZ',
      }),
    })
    expect(draft.status).toBe(201)
    const created = await draft.json()
    expect(created.status).toBe('pending')
    expect(created.number).toBe('DCN-000003')

    const confirmed = await fetch(API + '/' + created.id + '/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(confirmed.status).toBe(200)
    expect((await confirmed.json()).status).toBe('confirmed')
  })
})
