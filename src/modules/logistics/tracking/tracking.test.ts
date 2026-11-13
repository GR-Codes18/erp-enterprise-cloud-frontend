import { describe, expect, it } from "vitest"
import {
  buildTrackingTripFromOrder,
  formatDuration,
  getStopTimings,
  getTripMode,
  getTripProgress,
  haversineKm,
  type TrackingStop,
  type TrackingTrip,
} from "./tracking"

const stop = (n: number, over: Partial<TrackingStop> = {}): TrackingStop => ({
  id: `s${n}`,
  sequence: n,
  customer: `Cliente ${n}`,
  address: "Calle",
  position: { lat: -12 - n, lng: -77 },
  status: "pending",
  arrived_at: "",
  delivered_at: "",
  ...over,
})

const trip = (stops: TrackingStop[], over: Partial<TrackingTrip> = {}): TrackingTrip => ({
  id: "t1",
  reference: "TR-1",
  transporter: "T",
  driver_name: "D",
  vehicle_plate: "ABC-123",
  route: "R",
  status: "in_transit",
  origin: { name: "Almacén", position: { lat: -12, lng: -77 } },
  started_at: "2026-10-24T13:00:00Z",
  stops,
  vehicle: null,
  trail: [],
  route_path: [],
  ...over,
})

describe("tracking", () => {
  it("distingue destino directo de varias entregas", () => {
    expect(getTripMode(trip([stop(1)]))).toBe("direct")
    expect(getTripMode(trip([stop(1), stop(2)]))).toBe("multi_stop")
  })

  it("mide cuánto se demoró cada entrega", () => {
    const t = trip([
      stop(1, { status: "delivered", arrived_at: "2026-10-24T14:00:00Z", delivered_at: "2026-10-24T14:20:00Z" }),
      stop(2, { status: "delivered", arrived_at: "2026-10-24T15:30:00Z", delivered_at: "2026-10-24T15:45:00Z" }),
    ])
    const [first, second] = getStopTimings(t)
    expect(first).toEqual({ travelMs: 3_600_000, serviceMs: 1_200_000, totalMs: 4_800_000 })
    expect(second.travelMs).toBe(70 * 60_000)
    expect(second.serviceMs).toBe(15 * 60_000)
  })

  it("deja null lo que aún no pasó", () => {
    expect(getStopTimings(trip([stop(1)]))[0]).toEqual({ travelMs: null, serviceMs: null, totalMs: null })
  })

  it("calcula progreso y ETA con la posición del vehículo", () => {
    const t = trip([stop(1, { status: "delivered" }), stop(2), stop(3)], {
      vehicle: { lat: -12.5, lng: -77, speed_kmh: 60, heading: 180, recorded_at: "2026-10-24T14:00:00Z" },
    })
    const progress = getTripProgress(t, "2026-10-24T14:00:00Z")
    expect(progress.delivered).toBe(1)
    expect(progress.nextStop?.id).toBe("s2")
    expect(progress.nextEta).toBeGreaterThan(Date.parse("2026-10-24T14:00:00Z"))
    expect(progress.remainingKm).toBeGreaterThan(progress.nextStopKm ?? 0)
  })

  it("crea un viaje desde el almacén hacia la dirección del cliente", () => {
    const tripFromOrder = buildTrackingTripFromOrder({
      id: "order-1",
      number: "PED-000005",
      customer_name: "Comercial Andina S.A.C.",
      delivery_address: "Dirección de prueba 123, Lima",
      items: [{ warehouse_id: "00000000-0000-4000-8003-000000000001", warehouse_name: "Almacén Central Principal" }],
    })

    expect(tripFromOrder).not.toBeNull()
    expect(tripFromOrder?.status).toBe("planned")
    expect(tripFromOrder?.origin.name).toContain("Almacén Central Principal")
    expect(tripFromOrder?.stops[0].customer).toBe("Comercial Andina S.A.C.")
    expect(tripFromOrder?.stops[0].address).toContain("Lima")
  })

  it("formatea duraciones y distancias", () => {
    expect(formatDuration(90 * 60_000)).toBe("1 h 30 min")
    expect(formatDuration(45 * 60_000)).toBe("45 min")
    expect(formatDuration(-1)).toBe("—")
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 1)
  })
})
