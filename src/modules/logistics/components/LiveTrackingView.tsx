import { useState } from "react"
import { Clock, MapPin, Navigation, PackageCheck, Route, Truck } from "lucide-react"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { StatusBadge, type StatusTone } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { useLiveTracking } from "../tracking/trackingHooks"
import {
  STOP_STATUS_LABELS,
  TRIP_MODE_LABELS,
  TRIP_STATUS_LABELS,
  formatClock,
  formatDuration,
  formatKm,
  getStopTimings,
  getTripMode,
  getTripProgress,
  type StopStatus,
  type TrackingTrip,
  type TripMode,
  type TripStatus,
} from "../tracking/tracking"
import { TrackingMap } from "./TrackingMap"

const TRIP_TONES: Record<TripStatus, StatusTone> = {
  planned: "neutral",
  in_transit: "warning",
  delivered: "success",
  incident: "danger",
}
const STOP_TONES: Record<StopStatus, StatusTone> = {
  pending: "neutral",
  arrived: "warning",
  delivered: "success",
  failed: "danger",
}

type ModeFilter = "all" | TripMode
const MODE_FILTERS: { value: ModeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "direct", label: TRIP_MODE_LABELS.direct },
  { value: "multi_stop", label: TRIP_MODE_LABELS.multi_stop },
]

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}

function TripCard({ trip, serverTime, selected, onSelect }: { trip: TrackingTrip; serverTime: string; selected: boolean; onSelect: () => void }) {
  const progress = getTripProgress(trip, serverTime)
  const mode = getTripMode(trip)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary-soft" : "bg-card hover:bg-muted/50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{trip.reference}</p>
          <p className="text-xs text-muted-foreground">{trip.route}</p>
        </div>
        <StatusBadge tone={TRIP_TONES[trip.status]} label={TRIP_STATUS_LABELS[trip.status]} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{trip.driver_name} · {trip.vehicle_plate}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-medium">{TRIP_MODE_LABELS[mode]}</span>
        <span>{progress.delivered}/{progress.total} entregas</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress.delivered / progress.total) * 100}%` }} />
      </div>
    </button>
  )
}

function TripDetail({ trip, serverTime }: { trip: TrackingTrip; serverTime: string }) {
  const mode = getTripMode(trip)
  const progress = getTripProgress(trip, serverTime)
  const timings = getStopTimings(trip)
  const drivingMs = timings.reduce((sum, item) => sum + (item.travelMs ?? 0), 0)
  const serviceMs = timings.reduce((sum, item) => sum + (item.serviceMs ?? 0), 0)
  const finished = timings.filter((item) => item.serviceMs !== null).length
  const average = finished > 0 ? (drivingMs + serviceMs) / finished : null

  return (
    <div className="grid gap-4">
      {progress.nextStop && trip.status === "in_transit" && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Navigation className="size-4" aria-hidden="true" />
            {progress.nextStop.status === "arrived" ? "Entregando en" : "Rumbo a"} {progress.nextStop.customer}
          </p>
          {progress.nextStop.status === "pending" && (
            <p className="text-sm">Llega aprox. a las {formatClock(progress.nextEta)} · {formatKm(progress.nextStopKm)}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric icon={Truck} label="Velocidad" value={trip.vehicle ? `${Math.round(trip.vehicle.speed_kmh)} km/h` : "—"} />
        <Metric icon={Route} label="Recorrido / faltan" value={`${formatKm(progress.traveledKm)} / ${formatKm(progress.remainingKm)}`} />
        <Metric icon={Clock} label="Tiempo de viaje" value={progress.elapsedMs === null ? "—" : formatDuration(progress.elapsedMs)} />
        <Metric icon={PackageCheck} label="Entregas" value={`${progress.delivered} de ${progress.total}`} />
      </div>

      <section aria-label="Entregas del viaje" className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{mode === "multi_stop" ? "Paradas del viaje" : "Entrega directa"}</h2>
          <span className="text-xs text-muted-foreground">Salida: {formatClock(trip.started_at)}</span>
        </div>
        <ol className="grid gap-3">
          {trip.stops.map((stop, index) => {
            const timing = timings[index]
            const isNext = stop.id === progress.nextStop?.id && trip.status === "in_transit"
            return (
              <li key={stop.id} className={`rounded-lg border p-3 ${isNext ? "border-primary/50 bg-primary-soft" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-white">{stop.sequence}</span>
                    <div>
                      <p className="text-sm font-medium">{stop.customer}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" aria-hidden="true" />{stop.address}</p>
                    </div>
                  </div>
                  <StatusBadge tone={STOP_TONES[stop.status]} label={STOP_STATUS_LABELS[stop.status]} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <div><dt className="text-muted-foreground">Llegada</dt><dd className="font-medium">{isNext && stop.status === "pending" ? `~${formatClock(progress.nextEta)}` : formatClock(stop.arrived_at)}</dd></div>
                  <div><dt className="text-muted-foreground">Entrega terminada</dt><dd className="font-medium">{formatClock(stop.delivered_at)}</dd></div>
                  <div><dt className="text-muted-foreground">{index === 0 ? "En ruta desde la salida" : "En ruta desde la entrega anterior"}</dt><dd className="font-medium">{timing.travelMs === null ? "—" : formatDuration(timing.travelMs)}</dd></div>
                  <div><dt className="text-muted-foreground">Demora entregando</dt><dd className="font-medium">{timing.serviceMs === null ? "—" : formatDuration(timing.serviceMs)}</dd></div>
                </dl>
              </li>
            )
          })}
        </ol>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t pt-3 text-xs">
          <div><p className="text-muted-foreground">Total manejando</p><p className="font-semibold">{formatDuration(drivingMs)}</p></div>
          <div><p className="text-muted-foreground">Total entregando</p><p className="font-semibold">{formatDuration(serviceMs)}</p></div>
          <div><p className="text-muted-foreground">{mode === "multi_stop" ? "Promedio por entrega" : "Tiempo total"}</p><p className="font-semibold">{average === null ? "—" : formatDuration(average)}</p></div>
        </div>
      </section>
    </div>
  )
}

export function LiveTrackingView() {
  const live = useLiveTracking()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all")
  const [follow, setFollow] = useState(true)

  if (live.isError && !live.data) return <ErrorState message={getErrorMessage(live.error)} onRetry={() => void live.refetch()} />
  if (!live.data) return <Skeleton className="h-[480px] w-full rounded-xl" />

  const { trips, server_time: serverTime } = live.data
  const visible = trips.filter((trip) => modeFilter === "all" || getTripMode(trip) === modeFilter)
  const selected = visible.find((trip) => trip.id === selectedId) ?? visible[0] ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="grid content-start gap-3" aria-label="Viajes">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de viaje">
          {MODE_FILTERS.map((option) => (
            <Button key={option.value} size="sm" variant={modeFilter === option.value ? "default" : "outline"} onClick={() => setModeFilter(option.value)}>
              {option.label}
            </Button>
          ))}
        </div>
        {visible.map((trip) => (
          <TripCard key={trip.id} trip={trip} serverTime={serverTime} selected={trip.id === selected?.id} onSelect={() => setSelectedId(trip.id)} />
        ))}
        {visible.length === 0 && <EmptyState title="Sin viajes" description="No hay viajes de este tipo." />}
      </aside>

      {selected && (
        <div className="grid min-w-0 content-start gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selected.reference}</span> · {selected.driver_name} · {selected.vehicle_plate} · {TRIP_MODE_LABELS[getTripMode(selected)]}
            </p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
                <span className={`size-2 rounded-full ${live.isError ? "bg-red-500" : "bg-green-500"}`} />
                {live.isError ? "Sin señal, reintentando…" : `En vivo · ${formatClock(serverTime)}`}
              </span>
              <Button size="sm" variant={follow ? "default" : "outline"} aria-pressed={follow} onClick={() => setFollow((value) => !value)}>
                <Navigation aria-hidden="true" /> Seguir vehículo
              </Button>
            </div>
          </div>
          <TrackingMap trip={selected} follow={follow && selected.status === "in_transit"} />
          <TripDetail trip={selected} serverTime={serverTime} />
        </div>
      )}
    </div>
  )
}
