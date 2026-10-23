import { beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { driverAssignmentHandlers } from './mocks'

const API = '/logistics/driver-assignments'
const id = (n: number) => '00000000-0000-4000-8066-' + String(n).padStart(12, '0')

describe('mocks de asignación de conductores', () => {
  const server = setupServer(...driverAssignmentHandlers.handlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('mantiene las listas de datos semilla', async () => {
    const result = await (await fetch(API + '?size=50')).json()
    expect(result.total).toBe(2)
  })

  it('crea una asignación de conductor y la avanza al estado en curso', async () => {
    const draft = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: id(1),
        driver_id: id(1),
        assigned_by: 'Soporte Logística',
      }),
    })
    expect(draft.status).toBe(201)
    const created = await draft.json()
    expect(created.status).toBe('draft')
    expect(created.number).toBe('DRA-000003')

    const inProgress = await fetch(API + '/' + created.id + '/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(inProgress.status).toBe(200)
    expect((await inProgress.json()).status).toBe('in_progress')
  })
})
