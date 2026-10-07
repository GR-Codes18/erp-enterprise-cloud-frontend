import { Database } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const maintenanceModule: AppModule = {
  id: "maintenance",
  label: "Mantenimiento",
  icon: Database,
  basePath: "maintenance",
  sections: [
    {
      items: [
        { label: "Clientes", path: "customers", page: () => import("./pages/CustomersPage") },
        { label: "Proveedores", path: "suppliers" },
        { label: "Productos", path: "products" },
        { label: "Categorías", path: "categories" },
        { label: "Almacenes", path: "warehouses" },
      ],
    },
  ],
}
