import { ShoppingCart } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

// Lo que este módulo publica para otros (regla 0.5): solo tipos y hooks de consulta
export { useSalesInvoiceOptions } from "./hooks"
export type { SalesInvoiceOption } from "./hooks"

export const salesModule: AppModule = {
  id: "sales",
  label: "Ventas",
  icon: ShoppingCart,
  basePath: "sales",
  sections: [
    {
      items: [
        {
          label: "Cotizaciones",
          path: "quotes",
          permission: "sales.quotes:view",
          page: () => import("./pages/QuotesPage"),
          subRoutes: [
            { label: "Nueva cotización", path: "new", page: () => import("./pages/QuoteFormPage") },
            { label: "Editar cotización", path: ":id/edit", page: () => import("./pages/QuoteFormPage") },
            { label: "Detalle de cotización", path: ":id", page: () => import("./pages/QuoteDetailPage") },
          ],
        },
        {
          label: "Pedidos",
          path: "orders",
          permission: "sales.orders:view",
          page: () => import("./pages/OrdersPage"),
          subRoutes: [
            { label: "Nueva venta", path: "new", page: () => import("./pages/OrderFormPage") },
            { label: "Editar pedido", path: ":id/edit", page: () => import("./pages/OrderFormPage") },
            { label: "Detalle de pedido", path: ":id", page: () => import("./pages/OrderDetailPage") },
          ],
        },
        {
          label: "Comprobantes",
          path: "invoices",
          permission: "sales.invoices:view",
          page: () => import("./pages/InvoicesPage"),
          subRoutes: [{ label: "Detalle de comprobante", path: ":id", page: () => import("./pages/InvoiceDetailPage") }],
        },
        {
          label: "Devoluciones",
          path: "returns",
          permission: "sales.returns:view",
          page: () => import("./pages/ReturnsPage"),
          subRoutes: [
            { label: "Nueva devolución", path: "new", page: () => import("./pages/ReturnFormPage") },
            // Devoluciones no tiene acción "editar" en el catálogo de permisos: se edita con "crear"
            { label: "Editar devolución", path: ":id/edit", permission: "sales.returns:create", page: () => import("./pages/ReturnFormPage") },
            { label: "Detalle de devolución", path: ":id", page: () => import("./pages/ReturnDetailPage") },
          ],
        },
      ],
    },
  ],
}
