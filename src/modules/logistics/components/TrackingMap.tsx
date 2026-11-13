import { useEffect } from "react"
import L from "leaflet"
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "./liveTracking.css"
import type { GeoPoint, StopStatus, TrackingTrip } from "../tracking/tracking"

const toLatLng = (point: GeoPoint): [number, number] => [point.lat, point.lng]

const STOP_COLORS: Record<StopStatus, string> = {
  pending: "#64748b",
  arrived: "#d97706",
  delivered: "#16a34a",
  failed: "#dc2626",
}

const TRUCK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'

// Íconos únicos: si se recrearan en cada lectura GPS, Leaflet reemplazaría el elemento y se perdería la animación
const makeVehicleIcon = (stopped: boolean) =>
  L.divIcon({
    className: "live-vehicle-marker",
    html: `<div class="live-vehicle" data-stopped="${stopped}">${TRUCK_SVG}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
const VEHICLE_MOVING = makeVehicleIcon(false)
const VEHICLE_STOPPED = makeVehicleIcon(true)

const stopIcons = new Map<string, L.DivIcon>()
const stopIcon = (label: string, status: StopStatus) => {
  const key = `${label}:${status}`
  let icon = stopIcons.get(key)
  if (!icon) {
    icon = L.divIcon({
      className: "",
      html: `<div class="live-stop" style="background:${STOP_COLORS[status]}">${label}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
    stopIcons.set(key, icon)
  }
  return icon
}

const originIcon = L.divIcon({
  className: "",
  html: '<div class="live-stop" style="background:#0f172a">A</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

/** Encuadra el viaje al elegirlo; con "seguir" el mapa acompaña al vehículo. */
function CameraController({ trip, follow }: { trip: TrackingTrip; follow: boolean }) {
  const map = useMap()

  useEffect(() => {
    const points = [trip.origin.position, ...trip.stops.map((stop) => stop.position)].map(toLatLng)
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], animate: false })
    // Solo al cambiar de viaje: no queremos reencuadrar en cada lectura GPS
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, trip.id])

  const lat = trip.vehicle?.lat
  const lng = trip.vehicle?.lng
  useEffect(() => {
    if (follow && lat !== undefined && lng !== undefined) map.panTo([lat, lng], { animate: true, duration: 1 })
  }, [map, follow, lat, lng])

  return null
}

export function TrackingMap({ trip, follow }: { trip: TrackingTrip; follow: boolean }) {
  const vehicle = trip.vehicle
  return (
    <MapContainer
      center={toLatLng(trip.origin.position)}
      zoom={6}
      scrollWheelZoom
      className="h-[420px] w-full rounded-xl border"
      aria-label={`Mapa en vivo del despacho ${trip.reference}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CameraController trip={trip} follow={follow} />

      {/* Ruta planificada */}
      <Polyline positions={trip.route_path.map(toLatLng)} pathOptions={{ color: "#94a3b8", weight: 4, dashArray: "8 8" }} />
      {/* Recorrido real (GPS) */}
      {trip.trail.length > 1 && <Polyline positions={trip.trail.map(toLatLng)} pathOptions={{ color: "#2563eb", weight: 5 }} />}

      <Marker position={toLatLng(trip.origin.position)} icon={originIcon}>
        <Tooltip>{trip.origin.name}</Tooltip>
      </Marker>
      {trip.stops.map((stop) => (
        <Marker key={stop.id} position={toLatLng(stop.position)} icon={stopIcon(String(stop.sequence), stop.status)}>
          <Tooltip>{`${stop.sequence}. ${stop.customer}`}</Tooltip>
        </Marker>
      ))}

      {vehicle && (
        <Marker position={[vehicle.lat, vehicle.lng]} icon={vehicle.speed_kmh < 1 ? VEHICLE_STOPPED : VEHICLE_MOVING} zIndexOffset={1000}>
          <Tooltip>{`${trip.vehicle_plate} · ${Math.round(vehicle.speed_kmh)} km/h`}</Tooltip>
        </Marker>
      )}
    </MapContainer>
  )
}
