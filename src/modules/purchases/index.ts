import { ShoppingBag } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const purchasesModule: AppModule = {
  id: "purchases",
  label: "Compras",
  icon: ShoppingBag,
  basePath: "purchases",
  sections: [
    {
      items: [
        { label: "Solicitudes", path: "requests" },
        { label: "Órdenes", path: "orders" },
        { label: "Recepciones", path: "receptions" },
        { label: "Facturas de proveedor", path: "invoices" },
        { label: "Devoluciones", path: "returns" },
      ],
    },
  ],
}
