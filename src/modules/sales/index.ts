import { ShoppingCart } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const salesModule: AppModule = {
  id: "sales",
  label: "Ventas",
  icon: ShoppingCart,
  basePath: "sales",
  sections: [
    {
      items: [
        { label: "Cotizaciones", path: "quotes" },
        { label: "Pedidos", path: "orders" },
        { label: "Comprobantes", path: "invoices" },
        { label: "Devoluciones", path: "returns" },
      ],
    },
  ],
}
