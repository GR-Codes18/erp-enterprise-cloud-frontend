import type { AppModule } from '@/shared/types/module'
import { Truck } from 'lucide-react'

export const logisticsModule: AppModule = {
  id: 'logistics',
  label: 'Logística y transporte',
  icon: Truck,
  basePath: '/logistics',
  permission: 'logistics:view',
  sections: [
    {
      label: 'Planificación de despachos',
      items: [
        { label: 'Despachos', path: '/logistics/despatches', permission: 'logistics.despatches:view', page: () => import('./despatches/pages/DespatchesPage') },
        { label: 'Nuevo despacho', path: '/logistics/despatches/new', permission: 'logistics.despatches:create', page: () => import('./despatches/pages/DespatchFormPage') },
      ],
    },
    {
      label: 'Programación de rutas',
      items: [
        { label: 'Rutas', path: '/logistics/routes', permission: 'logistics.routes:view', page: () => import('./routes/pages/RoutesPage') },
        { label: 'Nueva ruta', path: '/logistics/routes/new', permission: 'logistics.routes:create', page: () => import('./routes/pages/RouteFormPage') },
      ],
    },
    {
      label: 'Asignación de vehículos',
      items: [
        { label: 'Vehículos', path: '/logistics/vehicle-assignments', permission: 'logistics.vehicles:view', page: () => import('./vehicle-assignments/pages/VehicleAssignmentsPage') },
        { label: 'Nueva asignación', path: '/logistics/vehicle-assignments/new', permission: 'logistics.vehicles:create', page: () => import('./vehicle-assignments/pages/VehicleAssignmentFormPage') },
      ],
    },
    {
      label: 'Asignación de conductores',
      items: [
        { label: 'Conductores', path: '/logistics/driver-assignments', permission: 'logistics.drivers:view', page: () => import('./driver-assignments/pages/DriverAssignmentsPage') },
        { label: 'Nueva asignación', path: '/logistics/driver-assignments/new', permission: 'logistics.drivers:create', page: () => import('./driver-assignments/pages/DriverAssignmentFormPage') },
      ],
    },
    {
      label: 'Seguimiento de entregas',
      items: [
        { label: 'Seguimientos', path: '/logistics/tracking', permission: 'logistics.tracking:view', page: () => import('./tracking/pages/TrackingPage') },
        { label: 'Nuevo avance', path: '/logistics/tracking/new', permission: 'logistics.tracking:create', page: () => import('./tracking/pages/TrackingFormPage') },
      ],
    },
    {
      label: 'Confirmación de entregas',
      items: [
        { label: 'Confirmaciones', path: '/logistics/delivery-confirmations', permission: 'logistics.confirmations:view', page: () => import('./delivery-confirmations/pages/DeliveryConfirmationsPage') },
        { label: 'Nueva confirmación', path: '/logistics/delivery-confirmations/new', permission: 'logistics.confirmations:create', page: () => import('./delivery-confirmations/pages/DeliveryConfirmationFormPage') },
      ],
    },
    {
      label: 'Devoluciones en ruta',
      items: [
        { label: 'Devoluciones', path: '/logistics/route-returns', permission: 'logistics.returns:view', page: () => import('./route-returns/pages/RouteReturnsPage') },
        { label: 'Nueva devolución', path: '/logistics/route-returns/new', permission: 'logistics.returns:create', page: () => import('./route-returns/pages/RouteReturnFormPage') },
      ],
    },
    {
      label: 'Costos y liquidación de ruta',
      items: [
        { label: 'Costos', path: '/logistics/route-costs', permission: 'logistics.costs:view', page: () => import('./route-costs/pages/RouteCostsPage') },
        { label: 'Nuevo costo', path: '/logistics/route-costs/new', permission: 'logistics.costs:create', page: () => import('./route-costs/pages/RouteCostFormPage') },
      ],
    },
  ],
}

export type LogisticsModule = typeof logisticsModule

export const logisticsPages = {
  despatches: {
    list: () => import('./despatches/pages/DespatchesPage'),
    form: () => import('./despatches/pages/DespatchFormPage'),
  },
  routes: {
    list: () => import('./routes/pages/RoutesPage'),
    form: () => import('./routes/pages/RouteFormPage'),
  },
  vehicleAssignments: {
    list: () => import('./vehicle-assignments/pages/VehicleAssignmentsPage'),
    form: () => import('./vehicle-assignments/pages/VehicleAssignmentFormPage'),
  },
  driverAssignments: {
    list: () => import('./driver-assignments/pages/DriverAssignmentsPage'),
    form: () => import('./driver-assignments/pages/DriverAssignmentFormPage'),
  },
  tracking: {
    list: () => import('./tracking/pages/TrackingPage'),
    form: () => import('./tracking/pages/TrackingFormPage'),
  },
  deliveryConfirmations: {
    list: () => import('./delivery-confirmations/pages/DeliveryConfirmationsPage'),
    form: () => import('./delivery-confirmations/pages/DeliveryConfirmationFormPage'),
  },
  routeReturns: {
    list: () => import('./route-returns/pages/RouteReturnsPage'),
    form: () => import('./route-returns/pages/RouteReturnFormPage'),
  },
  routeCosts: {
    list: () => import('./route-costs/pages/RouteCostsPage'),
    form: () => import('./route-costs/pages/RouteCostFormPage'),
  },
}

export const logisticsSchemas = {
  despatch: () => import('./despatches/schema'),
  route: () => import('./routes/schema'),
  vehicleAssignment: () => import('./vehicle-assignments/schema'),
  driverAssignment: () => import('./driver-assignments/schema'),
  tracking: () => import('./tracking/schema'),
  deliveryConfirmation: () => import('./delivery-confirmations/schema'),
  routeReturn: () => import('./route-returns/schema'),
  routeCost: () => import('./route-costs/schema'),
}
