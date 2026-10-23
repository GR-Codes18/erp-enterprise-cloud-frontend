import { beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { routeReturnHandlers } from './mocks'

const API = '/logistics/route-returns'
const id = (n: number) => '00000000-0000-4000-8069-' + String(n).padStart(12, '0')

describe('mocks de devoluciones en ruta', () => {
  const server = setupServer(...routeReturnHandlers.handlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('mantiene las listas de datos semilla', async () => {
    const result = await (await fetch(API + '?size=50')).json()
    expect(result.total).toBe(2)
  })

  it('crea una devolución y la avanza al estado iniciada', async () => {
    const draft = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: id(1),
        dispatch_id: id(1),
        type: 'crane',
        reason: 'Configuración errónea.',
        customer_signature: 'CARLOS RUIZ',
      }),
    })
    expect(draft.status).toBe(201)
    const created = await draft.json()
    expect(created.status).toBe('pending')
    expect(created.number).toBe('RTR-000003')

    const initiated = await fetch(API + '/' + created.id + '/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(initiated.status).toBe(200)
    expect((await initiated.json()).status).toBe('initiated')
  })
})
