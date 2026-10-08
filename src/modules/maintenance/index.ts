import { Database } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export { useSupplierOptions } from "./suppliers/hooks"

export const maintenanceModule: AppModule = {
  id: "maintenance",
  label: "Mantenimiento",
  icon: Database,
  basePath: "maintenance",
  sections: [
    {
      items: [
        { label: "Clientes", path: "customers", page: () => import("./pages/CustomersPage") },
        { label: "Proveedores", path: "suppliers", page: () => import("./pages/SuppliersPage") },
        { label: "Productos", path: "products" },
        { label: "Categorías", path: "categories" },
        { label: "Almacenes", path: "warehouses" },
      ],
    },
  ],
}