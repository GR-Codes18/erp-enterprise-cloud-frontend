import { beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { routeHandlers } from './mocks'

const API = '/logistics/routes'

describe('mocks de programación de rutas', () => {
  const server = setupServer(...routeHandlers.handlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('mantiene las listas de datos semilla', async () => {
    const result = await (await fetch(API + '?size=50')).json()
    expect(result.total).toBe(2)
  })

  it('crea una ruta y progresa su estado', async () => {
    const draft = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ruta Prueba',
        start_date: '2026-10-25',
        end_date: '2026-10-26',
        despatch_ids: [],
        notes: 'Ruta de prueba',
      }),
    })
    expect(draft.status).toBe(201)
    const created = await draft.json()
    expect(created.status).toBe('draft')
    expect(created.number).toBe('RUT-000003')

    const scheduled = await fetch(API + '/' + created.id + '/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(scheduled.status).toBe(200)
    expect((await scheduled.json()).status).toBe('scheduled')
  })
})
