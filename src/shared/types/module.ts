import type { ComponentType } from "react"

/** Carga diferida de una pantalla: () => import("./pages/QuotesPage") */
export type PageLoader = () => Promise<{ default: ComponentType }>

export interface ModuleItem {
  label: string
  /** Ruta relativa al basePath del módulo, sin "/" inicial */
  path: string
  /** Si no existe, se muestra una pantalla provisional */
  page?: PageLoader
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
  /** Solo para módulos con varias secciones */
  sections?: ModuleSection[]
}
