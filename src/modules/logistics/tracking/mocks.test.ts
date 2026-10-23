import { beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { trackingHandlers } from './mocks'

const API = '/logistics/tracking'
const id = (n: number) => '00000000-0000-4000-8067-' + String(n).padStart(12, '0')

describe('mocks de seguimiento de entregas', () => {
  const server = setupServer(...trackingHandlers.handlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('mantiene las listas de datos semilla', async () => {
    const result = await (await fetch(API + '?size=50')).json()
    expect(result.total).toBe(2)
  })

  it('crea un registro de seguimiento y avanza su estado', async () => {
    const draft = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: id(1),
        dispatch_id: id(1),
        progress: '40',
        note: 'Despacho en camino.',
      }),
    })
    expect(draft.status).toBe(201)
    const created = await draft.json()
    expect(created.status).toBe('pending')
    expect(created.number).toBe('TRK-000003')

    const started = await fetch(API + '/' + created.id + '/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(started.status).toBe(200)
    expect((await started.json()).status).toBe('in_progress')
  })
})
