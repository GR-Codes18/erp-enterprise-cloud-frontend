import { ShoppingBag } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

// Lo que este módulo publica para otros (regla 0.5): solo tipos y hooks de consulta
export { useSupplierInvoiceOptions } from "./hooks"
export type { SupplierInvoiceOption } from "./hooks"

export const purchasesModule: AppModule = {
  id: "purchases",
  label: "Compras",
  icon: ShoppingBag,
  basePath: "purchases",
  sections: [
    {
      items: [
        {
          label: "Solicitudes",
          path: "requests",
          permission: "purchases.requests:view",
          page: () => import("./pages/RequestsPage"),
          subRoutes: [
            { label: "Nueva solicitud", path: "new", page: () => import("./pages/RequestFormPage") },
            { label: "Editar solicitud", path: ":id/edit", page: () => import("./pages/RequestFormPage") },
            { label: "Detalle de solicitud", path: ":id", page: () => import("./pages/RequestDetailPage") },
          ],
        },
        {
          label: "Órdenes",
          path: "orders",
          permission: "purchases.orders:view",
          page: () => import("./pages/PurchaseOrdersPage"),
          subRoutes: [
            { label: "Nueva orden", path: "new", page: () => import("./pages/PurchaseOrderFormPage") },
            { label: "Editar orden", path: ":id/edit", page: () => import("./pages/PurchaseOrderFormPage") },
            { label: "Detalle de orden", path: ":id", page: () => import("./pages/PurchaseOrderDetailPage") },
          ],
        },
        {
          label: "Recepciones",
          path: "receptions",
          permission: "purchases.receptions:view",
          page: () => import("./pages/ReceptionsPage"),
          subRoutes: [
            { label: "Nueva recepción", path: "new", page: () => import("./pages/ReceptionFormPage") },
            // Recepciones no tiene acción "editar" en el catálogo: se edita el borrador con "crear"
            { label: "Editar recepción", path: ":id/edit", permission: "purchases.receptions:create", page: () => import("./pages/ReceptionFormPage") },
            { label: "Detalle de recepción", path: ":id", page: () => import("./pages/ReceptionDetailPage") },
          ],
        },
        {
          label: "Facturas de proveedor",
          path: "invoices",
          permission: "purchases.invoices:view",
          page: () => import("./pages/SupplierInvoicesPage"),
          subRoutes: [
            { label: "Registrar factura", path: "new", page: () => import("./pages/SupplierInvoiceFormPage") },
            { label: "Detalle de factura", path: ":id", page: () => import("./pages/SupplierInvoiceDetailPage") },
          ],
        },
        {
          label: "Devoluciones",
          path: "returns",
          permission: "purchases.returns:view",
          page: () => import("./pages/PurchaseReturnsPage"),
          subRoutes: [
            { label: "Nueva devolución", path: "new", page: () => import("./pages/PurchaseReturnFormPage") },
            { label: "Editar devolución", path: ":id/edit", permission: "purchases.returns:create", page: () => import("./pages/PurchaseReturnFormPage") },
            { label: "Detalle de devolución", path: ":id", page: () => import("./pages/PurchaseReturnDetailPage") },
          ],
        },
      ],
    },
  ],
}
