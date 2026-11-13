/** Tipos y cálculos del seguimiento en vivo. Todo son funciones puras (fáciles de probar). */

export interface GeoPoint {
  lat: number
  lng: number
}

export type TripStatus = "planned" | "in_transit" | "delivered" | "incident"
export type StopStatus = "pending" | "arrived" | "delivered" | "failed"
/** direct = un solo cliente · multi_stop = varias entregas en el mismo viaje */
export type TripMode = "direct" | "multi_stop"

export interface TrackingStop {
  id: string
  sequence: number
  customer: string
  address: string
  position: GeoPoint
  status: StopStatus
  /** Fecha-hora UTC de llegada al cliente ("" si aún no llega) */
  arrived_at: string
  /** Fecha-hora UTC en que se terminó de entregar ("" si aún no) */
  delivered_at: string
}

export interface VehiclePosition extends GeoPoint {
  speed_kmh: number
  heading: number
  recorded_at: string
}

export interface TrackingTrip {
  id: string
  reference: string
  transporter: string
  driver_name: string
  vehicle_plate: string
  route: string
  status: TripStatus
  origin: { name: string; position: GeoPoint }
  /** Hora real de salida del almacén ("" si todavía no sale) */
  started_at: string
  stops: TrackingStop[]
  /** Última posición GPS (null si el vehículo aún no reporta) */
  vehicle: VehiclePosition | null
  /** Recorrido ya hecho (historial GPS) */
  trail: GeoPoint[]
  /** Ruta planificada: origen → paradas */
  route_path: GeoPoint[]
}

export interface LiveTrackingResponse {
  /** Hora del servidor: el ETA se calcula con ella, no con el reloj del navegador */
  server_time: string
  trips: TrackingTrip[]
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  planned: "Programado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  incident: "Con incidencia",
}

export const STOP_STATUS_LABELS: Record<StopStatus, string> = {
  pending: "Pendiente",
  arrived: "En el cliente",
  delivered: "Entregado",
  failed: "No entregado",
}

export const getTripMode = (trip: TrackingTrip): TripMode => (trip.stops.length > 1 ? "multi_stop" : "direct")

export const TRIP_MODE_LABELS: Record<TripMode, string> = {
  direct: "Destino directo",
  multi_stop: "Varias entregas",
}

const EARTH_RADIUS_KM = 6371

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function pathKm(points: GeoPoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i])
  return total
}

const ms = (value: string) => (value ? Date.parse(value) : Number.NaN)

/** 90 min → "1 h 30 min"; 40 s → "40 s" */
export function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "—"
  const totalMinutes = Math.round(durationMs / 60_000)
  if (totalMinutes < 1) return `${Math.max(1, Math.round(durationMs / 1000))} s`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

export interface StopTiming {
  /** Tiempo de manejo hasta este cliente (desde la salida o desde la entrega anterior) */
  travelMs: number | null
  /** Tiempo que tomó entregar (llegada → entrega terminada) */
  serviceMs: number | null
  /** Manejo + entrega */
  totalMs: number | null
}

/**
 * Cuánto se demoró cada entrega. En un viaje con varias paradas, el tramo de cada una
 * parte de la entrega anterior; en un viaje directo, de la salida del almacén.
 */
export function getStopTimings(trip: TrackingTrip): StopTiming[] {
  return trip.stops.map((stop, index) => {
    const departure = index === 0 ? ms(trip.started_at) : ms(trip.stops[index - 1].delivered_at)
    const arrival = ms(stop.arrived_at)
    const done = ms(stop.delivered_at)
    const travelMs = Number.isNaN(departure) || Number.isNaN(arrival) ? null : arrival - departure
    const serviceMs = Number.isNaN(arrival) || Number.isNaN(done) ? null : done - arrival
    const totalMs = Number.isNaN(departure) || Number.isNaN(done) ? null : done - departure
    return { travelMs, serviceMs, totalMs }
  })
}

export interface TripProgress {
  delivered: number
  total: number
  nextStop: TrackingStop | null
  /** Km que faltan hasta la próxima parada */
  nextStopKm: number | null
  /** Km que faltan hasta terminar el viaje */
  remainingKm: number | null
  /** ETA a la próxima parada (ms UTC) */
  nextEta: number | null
  /** Duración total del viaje hasta ahora o hasta que terminó */
  elapsedMs: number | null
  /** Km recorridos según el historial GPS */
  traveledKm: number
}

export function getTripProgress(trip: TrackingTrip, serverTime: string): TripProgress {
  const now = ms(serverTime)
  const delivered = trip.stops.filter((stop) => stop.status === "delivered").length
  const nextStop = trip.stops.find((stop) => stop.status === "pending" || stop.status === "arrived") ?? null
  const started = ms(trip.started_at)
  const lastDelivery = Math.max(...trip.stops.map((stop) => ms(stop.delivered_at)).filter(Number.isFinite), Number.NaN)
  const end = trip.status === "delivered" && Number.isFinite(lastDelivery) ? lastDelivery : now
  const elapsedMs = Number.isNaN(started) || Number.isNaN(end) ? null : Math.max(0, end - started)
  const traveledKm = pathKm([...trip.trail])

  if (!trip.vehicle || !nextStop) {
    return { delivered, total: trip.stops.length, nextStop, nextStopKm: null, remainingKm: null, nextEta: null, elapsedMs, traveledKm }
  }

  const here: GeoPoint = trip.vehicle
  const nextStopKm = nextStop.status === "arrived" ? 0 : haversineKm(here, nextStop.position)
  const pending = trip.stops.filter((stop) => stop.status === "pending")
  const rest = pending.filter((stop) => stop.id !== nextStop.id).map((stop) => stop.position)
  const remainingKm = nextStopKm + pathKm([nextStop.position, ...rest])
  const speed = trip.vehicle.speed_kmh > 5 ? trip.vehicle.speed_kmh : 60
  const nextEta = Number.isNaN(now) || nextStop.status === "arrived" ? null : now + (nextStopKm / speed) * 3_600_000
  return { delivered, total: trip.stops.length, nextStop, nextStopKm, remainingKm, nextEta, elapsedMs, traveledKm }
}

export const formatKm = (km: number | null) => (km === null ? "—" : `${km.toFixed(km < 10 ? 1 : 0)} km`)

export const formatClock = (value: string | number | null) =>
  value === null || value === ""
    ? "—"
    : new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(value))
