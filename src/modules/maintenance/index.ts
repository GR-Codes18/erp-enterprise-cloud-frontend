import { Database } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

// Lo que este módulo publica para otros (regla 0.5): solo tipos y hooks de consulta
export { useCustomerOptions } from "./customers/hooks"
export { useUpdateCustomerAddress } from "./customers/hooks"
export type { CustomerOption } from "./customers/hooks"
export { useSupplierOptions } from "./suppliers/hooks"
export type { SupplierOption } from "./suppliers/hooks"
export { useCategoryOptions } from "./categories/hooks"
export type { CategoryOption } from "./categories/hooks"
export { useWarehouseOptions } from "./warehouses/hooks"
export type { WarehouseOption } from "./warehouses/hooks"
export { useProductOptions } from "./products/hooks"
export type { ProductOption } from "./products/hooks"

export const maintenanceModule: AppModule = {
  id: "maintenance",
  label: "Mantenimiento",
  icon: Database,
  basePath: "maintenance",
  sections: [
    {
      items: [
        { label: "Clientes", path: "customers", permission: "maintenance.customers:view", page: () => import("./pages/CustomersPage") },
        { label: "Proveedores", path: "suppliers", permission: "maintenance.suppliers:view", page: () => import("./pages/SuppliersPage") },
        { label: "Productos", path: "products", permission: "maintenance.products:view", page: () => import("./pages/ProductsPage") },
        { label: "Categorías", path: "categories", permission: "maintenance.categories:view", page: () => import("./pages/CategoriesPage") },
        { label: "Almacenes", path: "warehouses", permission: "maintenance.warehouses:view", page: () => import("./pages/WarehousesPage") },
      ],
    },
  ],
}