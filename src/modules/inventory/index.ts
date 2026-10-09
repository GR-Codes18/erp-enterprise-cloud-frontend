import { Boxes } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const inventoryModule: AppModule = {
  id: "inventory",
  label: "Inventario",
  icon: Boxes,
  basePath: "inventory",
  sections: [
    {
      items: [
        { label: "Stock", path: "stock", page: () => import("./pages/StockPage") },
        { label: "Kardex", path: "kardex", page: () => import("./pages/KardexPage") },
        {
          label: "Transferencias",
          path: "transfers",
          page: () => import("./pages/TransfersPage"),
          subRoutes: [
            { label: "Nueva transferencia", path: "new", page: () => import("./pages/TransferFormPage") },
            { label: "Editar transferencia", path: ":id/edit", page: () => import("./pages/TransferFormPage") },
            { label: "Detalle de transferencia", path: ":id", page: () => import("./pages/TransferDetailPage") },
          ],
        },
        {
          label: "Ajustes",
          path: "adjustments",
          page: () => import("./pages/AdjustmentsPage"),
          subRoutes: [
            { label: "Nuevo ajuste", path: "new", page: () => import("./pages/AdjustmentFormPage") },
            { label: "Editar ajuste", path: ":id/edit", page: () => import("./pages/AdjustmentFormPage") },
            { label: "Detalle de ajuste", path: ":id", page: () => import("./pages/AdjustmentDetailPage") },
          ],
        },
      ],
    },
  ],
}