import type { AppModule } from "@/shared/types/module"

export interface Breadcrumb {
  moduleLabel: string
  itemLabel?: string
  subItemLabel?: string
}

function getSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean)
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
  return modules.find((module) => module.basePath === firstSegment)
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
    .find((candidate) => candidate.path === secondSegment)

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