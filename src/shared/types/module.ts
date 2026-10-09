import type { ComponentType } from "react"

/** Carga diferida de una pantalla: () => import("./pages/QuotesPage") */
export type PageLoader = () => Promise<{ default: ComponentType }>

export interface SubRoute {
  label: string
  /** Ruta relativa a la ruta del ítem padre (ej. "new", ":id") */
  path: string
  /** Si no existe, se muestra una pantalla provisional */
  page?: PageLoader
  /** Permiso para abrirla, ej. "sales.quotes:create". Sin él, se usa el del ítem padre */
  permission?: string
}

export interface ModuleItem {
  label: string
  /** Ruta relativa al basePath del módulo, sin "/" inicial */
  path: string
  /** Si no existe, se muestra una pantalla provisional */
  page?: PageLoader
  /** Permiso para ver la pantalla, ej. "sales.quotes:view". Sin él, la ve cualquiera con sesión */
  permission?: string
  /** Subrutas no visibles en el Sidebar pero pertenecientes a este ítem */
  subRoutes?: SubRoute[]
}

export interface ModuleSection {
  /** Título opcional que agrupa ítems dentro del módulo (ej. "Seguridad") */
  label?: string
  items: ModuleItem[]
}

export interface AppModule {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** Primer segmento de la URL, sin "/" inicial */
  basePath: string
  /** Solo para módulos de una sola pantalla (Dashboard, Documentos) */
  page?: PageLoader
  /** Permiso de la pantalla única (módulos con `page`) */
  permission?: string
  /** Solo para módulos con varias secciones */
  sections?: ModuleSection[]
}
