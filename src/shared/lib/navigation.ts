import type { AppModule } from "@/shared/types/module"

export interface Breadcrumb {
  moduleLabel: string
  itemLabel?: string
}

function getSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean)
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
 * Devuelve el módulo y la sección de la URL actual, o undefined si la URL
 * no corresponde a ninguna pantalla conocida (ej. una página 404).
 */
export function getBreadcrumb(
  modules: AppModule[],
  pathname: string,
): Breadcrumb | undefined {
  const activeModule = findActiveModule(modules, pathname)
  if (!activeModule) return undefined

  const [, secondSegment] = getSegments(pathname)

  if (!secondSegment) return { moduleLabel: activeModule.label }

  const item = activeModule.sections
    ?.flatMap((section) => section.items)
    .find((candidate) => candidate.path === secondSegment)

  if (!item) return undefined

  return { moduleLabel: activeModule.label, itemLabel: item.label }
}
