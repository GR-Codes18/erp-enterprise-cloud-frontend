import type { AppModule } from "@/shared/types/module"

export interface Breadcrumb {
  moduleLabel: string
  itemLabel?: string
  subItemLabel?: string
}

function getSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean)
}

export function normalizeRoutePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "")
}

export function joinModulePath(basePath: string, itemPath?: string): string {
  const base = normalizeRoutePath(basePath)
  const item = itemPath ? normalizeRoutePath(itemPath) : ""

  if (!base && !item) return "/"
  if (!item) return base ? `/${base}` : "/"
  if (item === base || item.startsWith(`${base}/`)) return `/${item}`
  return base ? `/${base}/${item}` : `/${item}`
}

export function stripBasePath(basePath: string, route: string): string {
  const base = normalizeRoutePath(basePath)
  const path = normalizeRoutePath(route)

  if (!base) return path
  if (!path) return ""
  if (path === base) return ""
  if (path.startsWith(`${base}/`)) return path.slice(base.length + 1)

  return path
}

/** Compara un patrón de subruta (ej. "new" o ":id") con los segmentos restantes de la URL */
function matchSubRoute(pattern: string, remainingSegments: string[]): boolean {
  const patternSegments = pattern.split("/").filter(Boolean)
  if (patternSegments.length !== remainingSegments.length) return false

  return patternSegments.every((patternSeg, index) => {
    if (patternSeg.startsWith(":")) return true // Coincide con parámetros dinámicos como :id
    return patternSeg === remainingSegments[index]
  })
}

/** Devuelve el módulo cuyo basePath coincide con el primer segmento de la URL. */
export function findActiveModule(
  modules: AppModule[],
  pathname: string,
): AppModule | undefined {
  const [firstSegment] = getSegments(pathname)
  return modules.find((module) => normalizeRoutePath(module.basePath) === firstSegment)
}

/**
 * Devuelve la miga de pan (breadcrumb) para la URL actual, incluyendo subrutas.
 */
export function getBreadcrumb(
  modules: AppModule[],
  pathname: string,
): Breadcrumb | undefined {
  const activeModule = findActiveModule(modules, pathname)
  if (!activeModule) return undefined

  const [, secondSegment, ...remainingSegments] = getSegments(pathname)

  if (!secondSegment) return { moduleLabel: activeModule.label }

  const item = activeModule.sections
    ?.flatMap((section) => section.items)
    .find((candidate) => stripBasePath(activeModule.basePath, candidate.path) === secondSegment)

  if (!item) return undefined

  // Si no hay más segmentos, la URL corresponde al ítem principal
  if (remainingSegments.length === 0) {
    return { moduleLabel: activeModule.label, itemLabel: item.label }
  }

  // Si hay más segmentos, buscar coincidencia dentro de sus subrutas
  const matchingSubRoute = item.subRoutes?.find((sub) =>
    matchSubRoute(sub.path, remainingSegments),
  )

  if (matchingSubRoute) {
    return {
      moduleLabel: activeModule.label,
      itemLabel: item.label,
      subItemLabel: matchingSubRoute.label,
    }
  }

  // Fallback si no coincide con ninguna subruta conocida
  return { moduleLabel: activeModule.label, itemLabel: item.label }
}
/**
 * Menú según los permisos de la persona: quita las pantallas que no puede ver, las secciones
 * que quedan vacías y los módulos sin ninguna pantalla. `can` responde si tiene un permiso.
 */
export function filterModulesByPermission(
  modules: AppModule[],
  can: (permission: string) => boolean,
): AppModule[] {
  const allowed = (permission?: string) => permission === undefined || can(permission)

  return modules.flatMap((module) => {
    if (!module.sections) return allowed(module.permission) ? [module] : []

    const sections = module.sections
      .map((section) => ({ ...section, items: section.items.filter((item) => allowed(item.permission)) }))
      .filter((section) => section.items.length > 0)

    return sections.length > 0 ? [{ ...module, sections }] : []
  })
}

/** Ruta de la primera pantalla del menú (ya filtrado), ej. "/inventory/stock". undefined si no hay ninguna */
export function firstPath(modules: AppModule[]): string | undefined {
  const [first] = modules
  if (!first) return undefined
  const item = first.sections?.flatMap((section) => section.items)[0]
  return joinModulePath(first.basePath, item?.path)
}
