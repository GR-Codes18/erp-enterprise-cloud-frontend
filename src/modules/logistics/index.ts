import { Truck } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const logisticsModule: AppModule = {
  id: "logistics",
  label: "Logística y transportes",
  icon: Truck,
  basePath: "logistics",
  sections: [
    {
      items: [
        {
          label: "Planificación de despachos",
          path: "dispatch-planning",
          description: "Planifica los despachos y consulta sus fechas, destinos y costos de transporte.",
          keyFields: ["referencia", "origen", "destino", "fecha programada", "estado"],
          page: () => import("./pages/LogisticsPage"),
        },
        {
          label: "Programación de rutas",
          path: "route-scheduling",
          description: "Organiza las rutas y fechas previstas para atender los despachos.",
          keyFields: ["ruta", "origen", "destino", "fecha", "estado"],
          page: () => import("./pages/RouteSchedulingPage"),
        },
        {
          label: "Asignación de vehículos",
          path: "vehicle-assignment",
          description: "Asocia vehículos disponibles con las rutas y despachos programados.",
          keyFields: ["vehículo", "placa", "ruta", "capacidad", "estado"],
          page: () => import("./pages/VehicleAssignmentPage"),
        },
        {
          label: "Asignación de conductores",
          path: "driver-assignment",
          description: "Asigna conductores a los vehículos y rutas de cada despacho.",
          keyFields: ["conductor", "documento", "vehículo", "ruta", "estado"],
          page: () => import("./pages/DriverAssignmentPage"),
        },
        {
          label: "Seguimiento de entregas",
          path: "delivery-tracking",
          description: "Consulta el avance de los despachos y el estado de sus entregas.",
          keyFields: ["referencia", "destino", "fecha programada", "transportista", "estado"],
          page: () => import("./pages/DeliveryTrackingPage"),
        },
        {
          label: "Confirmación de entrega",
          path: "delivery-confirmation",
          description: "Registra y consulta la confirmación de recepción de los despachos.",
          keyFields: ["referencia", "destinatario", "fecha de entrega", "evidencia", "estado"],
          page: () => import("./pages/DeliveryConfirmationPage"),
        },
        {
          label: "Devoluciones en ruta",
          path: "route-returns",
          description: "Administra las devoluciones y novedades reportadas durante el recorrido.",
          keyFields: ["referencia", "motivo", "fecha", "conductor", "estado"],
          page: () => import("./pages/RouteReturnsPage"),
        },
        {
          label: "Costos y liquidación de ruta",
          path: "route-costs-settlement",
          description: "Consulta los costos asociados y la liquidación de cada ruta.",
          keyFields: ["ruta", "combustible", "peajes", "otros costos", "total"],
          page: () => import("./pages/RouteCostsSettlementPage"),
        },
      ],
    },
  ],
}
