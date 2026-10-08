import { Database } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export { useSupplierOptions } from "./suppliers/hooks"
export { useCategoryOptions } from "./categories/hooks"
export { useWarehouseOptions } from "./warehouses/hooks"

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
        { label: "Categorías", path: "categories", page: () => import("./pages/CategoriesPage") },
        { label: "Almacenes", path: "warehouses", page: () => import("./pages/WarehousesPage") },
      ],
    },
  ],
}