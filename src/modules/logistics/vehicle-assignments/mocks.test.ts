import { beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { vehicleAssignmentHandlers } from './mocks'

const API = '/logistics/vehicle-assignments'
const id = (n: number) => '00000000-0000-4000-8064-' + String(n).padStart(12, '0')

describe('mocks de asignación de vehículos', () => {
  const server = setupServer(...vehicleAssignmentHandlers.handlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('mantiene las listas de datos semilla', async () => {
    const result = await (await fetch(API + '?size=50')).json()
    expect(result.total).toBe(2)
  })

  it('crea una asignación de vehículo y la avanza al estado en uso', async () => {
    const draft = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: id(1),
        vehicle_id: id(1),
        driver_id: id(1),
        final_odo: '45231.20',
      }),
    })
    expect(draft.status).toBe(201)
    const created = await draft.json()
    expect(created.status).toBe('draft')
    expect(created.number).toBe('VMA-000003')

    const inUse = await fetch(API + '/' + created.id + '/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(inUse.status).toBe(200)
    expect((await inUse.json()).status).toBe('in_use')
  })
})
