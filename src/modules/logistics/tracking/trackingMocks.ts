import { delay, http, HttpResponse } from "msw"
import { env } from "@/config/env"
import {
  buildTrackingTripFromOrder,
  haversineKm,
  type GeoPoint,
  type LiveTrackingResponse,
  type TrackingStop,
  type TrackingTrip,
} from "./tracking"

/**
 * Simulador de GPS para la demo. Cada vez que el navegador pide /live, los vehículos
 * avanzan por la ruta, llegan a cada cliente, "entregan" y siguen.
 * TIME_SCALE: 1 s real = 3 min simulados (así un viaje de horas se ve en minutos).
 */
const TIME_SCALE = 180
const DWELL_MS = 25 * 60_000
const CRUISE_KMH = 70
const TRAIL_LIMIT = 250

const loadedAt = Date.now()
// Hoy a las 08:00 hora de Lima (UTC-5)
const simBase = (() => {
  const date = new Date()
  date.setUTCHours(13, 0, 0, 0)
  return date.getTime()
})()
const simNow = () => simBase + (Date.now() - loadedAt) * TIME_SCALE
const iso = (time: number) => new Date(time).toISOString()

interface SimTrip {
  trip: TrackingTrip
  /** Hora simulada en que sale el vehículo (si no es estático) */
  departAt: number
  /** Km acumulados del recorrido hasta cada parada */
  stopKm: number[]
  path: GeoPoint[]
  cumulative: number[]
  km: number
  cursor: number
  dwellUntil: number | null
  frozen: boolean
  notified: boolean
}

const point = (lat: number, lng: number): GeoPoint => ({ lat, lng })

function stop(sequence: number, id: string, customer: string, address: string, position: GeoPoint): TrackingStop {
  return { id, sequence, customer, address, position, status: "pending", arrived_at: "", delivered_at: "" }
}

function buildSim(trip: TrackingTrip, departAt: number, frozen = false): SimTrip {
  const path = [trip.origin.position, ...trip.stops.map((item) => item.position)]
  const cumulative = [0]
  for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + haversineKm(path[i - 1], path[i]))
  trip.route_path = path
  return { trip, departAt, stopKm: cumulative.slice(1), path, cumulative, km: 0, cursor: departAt, dwellUntil: null, frozen, notified: false }
}

function locate(sim: SimTrip): { position: GeoPoint; heading: number } {
  const { path, cumulative, km } = sim
  let i = 1
  while (i < path.length - 1 && cumulative[i] < km) i++
  const from = path[i - 1]
  const to = path[i]
  const span = cumulative[i] - cumulative[i - 1] || 1
  const t = Math.min(1, Math.max(0, (km - cumulative[i - 1]) / span))
  const heading = (Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180) / Math.PI
  return { position: point(from.lat + (to.lat - from.lat) * t, from.lng + (to.lng - from.lng) * t), heading: (heading + 360) % 360 }
}

function advance(sim: SimTrip, now: number) {
  const { trip } = sim
  if (sim.frozen || trip.status === "delivered") {
    if (trip.status === "delivered" && !sim.notified && typeof window !== "undefined" && typeof window.alert === "function") {
      sim.notified = true
      const customer = trip.stops.at(-1)?.customer ?? "el cliente"
      window.alert(`Entrega confirmada: ${trip.reference} llegó a ${customer}.`)
    }
    return
  }

  if (trip.status === "planned") {
    if (now < sim.departAt) return
    trip.status = "in_transit"
    trip.started_at = iso(sim.departAt)
    trip.vehicle = { ...trip.origin.position, speed_kmh: 0, heading: 0, recorded_at: iso(sim.departAt) }
    sim.cursor = sim.departAt
  }

  const speedKmMs = CRUISE_KMH / 3_600_000
  while (sim.cursor < now && trip.status === "in_transit") {
    const current = trip.stops.find((item) => item.status !== "delivered")
    if (!current) {
      trip.status = "delivered"
      break
    }
    const index = trip.stops.indexOf(current)

    if (sim.dwellUntil !== null) {
      if (now < sim.dwellUntil) {
        sim.cursor = now
        break
      }
      current.status = "delivered"
      current.delivered_at = iso(sim.dwellUntil)
      sim.cursor = sim.dwellUntil
      sim.dwellUntil = null
      continue
    }

    const remainingKm = sim.stopKm[index] - sim.km
    const travelMs = remainingKm / speedKmMs
    if (sim.cursor + travelMs <= now) {
      sim.km = sim.stopKm[index]
      sim.cursor += travelMs
      current.status = "arrived"
      current.arrived_at = iso(sim.cursor)
      sim.dwellUntil = sim.cursor + DWELL_MS
    } else {
      sim.km += (now - sim.cursor) * speedKmMs
      sim.cursor = now
    }
  }

  const { position, heading } = locate(sim)
  const moving = trip.status === "in_transit" && sim.dwellUntil === null
  trip.vehicle = {
    ...position,
    speed_kmh: moving ? CRUISE_KMH + Math.round(Math.sin(now / 900_000) * 8) : 0,
    heading,
    recorded_at: iso(Math.min(now, sim.cursor)),
  }
  trip.trail = [...trip.trail, position].slice(-TRAIL_LIMIT)
}

export function registerOrderTrackingTrip(order: {
  id: string
  number: string
  customer_name: string
  delivery_address: string
  items: Array<{ warehouse_id: string; warehouse_name?: string }>
}): TrackingTrip | null {
  const trip = buildTrackingTripFromOrder(order)
  if (!trip) return null
  const departAt = Date.now() + 5_000
  const sim = buildSim(trip, departAt)
  sims.push(sim)
  return trip
}

const base = (data: Omit<TrackingTrip, "vehicle" | "trail" | "route_path" | "started_at" | "status">): TrackingTrip => ({
  ...data,
  status: "planned",
  started_at: "",
  vehicle: null,
  trail: [],
  route_path: [],
})

const lima = point(-12.0464, -77.0428)
const sims: SimTrip[] = []

// TR-2026-001 · En tránsito · VARIAS ENTREGAS (Lima → Ica → Nasca → Arequipa)
sims.push(
  buildSim(
    base({
      id: "00000000-0000-4000-8020-000000009101",
      reference: "TR-2026-001",
      transporter: "Transportes del Pacífico",
      driver_name: "Carlos Mendoza",
      vehicle_plate: "ABC-123",
      route: "Lima - Arequipa",
      origin: { name: "Almacén Central, Lima", position: lima },
      stops: [
        stop(1, "s-001-1", "Distribuidora Ica Norte", "Av. Los Maestros 410, Ica", point(-14.0678, -75.7286)),
        stop(2, "s-001-2", "Comercial Nasca", "Jr. Lima 220, Nasca", point(-14.8309, -74.9385)),
        stop(3, "s-001-3", "Almacenes Arequipa SAC", "Parque Industrial, Arequipa", point(-16.4090, -71.5375)),
      ],
    }),
    simBase,
  ),
)

// TR-2026-002 · Programado, sale en ~1 min reales · DESTINO DIRECTO (Lima → Trujillo)
sims.push(
  buildSim(
    base({
      id: "00000000-0000-4000-8020-000000009102",
      reference: "TR-2026-002",
      transporter: "Logística Andina",
      driver_name: "Rosa Paredes",
      vehicle_plate: "DEF-456",
      route: "Lima - Trujillo",
      origin: { name: "Almacén Central, Lima", position: lima },
      stops: [stop(1, "s-002-1", "Supermercados La Libertad", "Av. España 1050, Trujillo", point(-8.1091, -79.0215))],
    }),
    simBase + 60 * TIME_SCALE * 1000,
  ),
)

// TR-2026-003 · Entregado · DESTINO DIRECTO (Arequipa → Cusco), ya terminado
const done = buildSim(
  {
    ...base({
      id: "00000000-0000-4000-8020-000000009103",
      reference: "TR-2026-003",
      transporter: "Carga Segura S.A.C.",
      driver_name: "Luis Quispe",
      vehicle_plate: "GHI-789",
      route: "Arequipa - Cusco",
      origin: { name: "Sucursal Arequipa", position: point(-16.409, -71.5375) },
      stops: [stop(1, "s-003-1", "María Salas", "Av. de la Cultura 305, Cusco", point(-13.5319, -71.9675))],
    }),
    status: "delivered",
    started_at: "2026-10-20T12:00:00Z",
  },
  0,
  true,
)
done.trip.stops[0] = { ...done.trip.stops[0], status: "delivered", arrived_at: "2026-10-20T20:10:00Z", delivered_at: "2026-10-20T20:35:00Z" }
done.trip.vehicle = { ...done.trip.stops[0].position, speed_kmh: 0, heading: 0, recorded_at: "2026-10-20T20:35:00Z" }
done.trip.trail = done.path
sims.push(done)

export const trackingHandlers = [
  http.get(`${env.apiBaseUrl}/logistics/tracking/live`, async () => {
    await delay(150)
    const now = simNow()
    sims.forEach((sim) => advance(sim, now))
    const body: LiveTrackingResponse = {
      server_time: iso(now),
      trips: sims.map((sim) => structuredClone(sim.trip)),
    }
    return HttpResponse.json(body)
  }),
]
