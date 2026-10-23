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
  label: "Maestro",
  icon: Database,
  basePath: "maintenance",
  sections: [
    {
      label: "Organización",
      items: [
        { label: "Empresas", path: "companies", permission: "maintenance.companies:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Sucursales", path: "branches", permission: "maintenance.branches:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Almacenes", path: "warehouses", permission: "maintenance.warehouses:view", page: () => import("./pages/WarehousesPage") },
      ],
    },
    {
      label: "Inventario y productos",
      items: [
        { label: "Productos", path: "products", permission: "maintenance.products:view", page: () => import("./pages/ProductsPage") },
        { label: "Categorías", path: "categories", permission: "maintenance.categories:view", page: () => import("./pages/CategoriesPage") },
        { label: "Marcas", path: "brands", permission: "maintenance.brands:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Unidades de medida", path: "units", permission: "maintenance.units:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Conversiones de unidades", path: "unit-conversions", permission: "maintenance.unit-conversions:view", page: () => import("./pages/MasterCatalogPage") },
      ],
    },
    {
      label: "Comercial y clientes",
      items: [
        { label: "Clientes", path: "customers", permission: "maintenance.customers:view", page: () => import("./pages/CustomersPage") },
        { label: "Proveedores", path: "suppliers", permission: "maintenance.suppliers:view", page: () => import("./pages/SuppliersPage") },
        { label: "Transportistas", path: "transporters", permission: "maintenance.transporters:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Vendedores", path: "sellers", permission: "maintenance.sellers:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Zonas", path: "zones", permission: "maintenance.zones:view", page: () => import("./pages/MasterCatalogPage") },
      ],
    },
    {
      label: "Finanzas",
      items: [
        { label: "Monedas y tipos de cambio", path: "currencies", permission: "maintenance.currencies:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Impuestos", path: "taxes", permission: "maintenance.taxes:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Formas de pago", path: "payment-methods", permission: "maintenance.payment-methods:view", page: () => import("./pages/MasterCatalogPage") },
        { label: "Listas de precios", path: "price-lists", permission: "maintenance.price-lists:view", page: () => import("./pages/MasterCatalogPage") },
      ],
    },
  ],
}