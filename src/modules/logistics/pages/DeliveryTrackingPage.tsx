import { useState } from "react"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { LiveTrackingView } from "../components/LiveTrackingView"
import { LogisticsOperationPage } from "./LogisticsOperationPage"

type Tab = "live" | "records"

export default function DeliveryTrackingPage() {
  const [tab, setTab] = useState<Tab>("live")

  return (
    <>
      <div className="mb-4 flex gap-2" role="group" aria-label="Vista de seguimiento">
        <Button variant={tab === "live" ? "default" : "outline"} aria-pressed={tab === "live"} onClick={() => setTab("live")}>En vivo</Button>
        <Button variant={tab === "records" ? "default" : "outline"} aria-pressed={tab === "records"} onClick={() => setTab("records")}>Registros</Button>
      </div>
      {tab === "live" ? (
        <>
          <PageHeader title="Seguimiento de entregas" description="Ubicación del vehículo en tiempo real, paradas y tiempo de cada entrega." />
          <LiveTrackingView />
        </>
      ) : (
        <LogisticsOperationPage resource="delivery-tracking" />
      )}
    </>
  )
}