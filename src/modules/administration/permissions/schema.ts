import { z } from "zod"

export const PERMISSION_ACTIONS = ["view", "create", "edit", "void", "approve", "execute"] as const
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Ver",
  create: "Crear",
  edit: "Editar",
  void: "Anular / Eliminar",
  approve: "Aprobar",
  execute: "Ejecutar",
}

/** Un permiso es "<código de pantalla>:<acción>", por ejemplo "inventory.stock:view" */
export const PERMISSION_PATTERN = /^[a-z]+\.[a-z_]+:(view|create|edit|void|approve|execute)$/

/** Una pantalla del catálogo y las acciones que existen para ella */
export const permissionScreenSchema = z.object({
  id: z.string(),
  code: z.string(),
  module: z.string(),
  module_label: z.string(),
  label: z.string(),
  actions: z.array(z.enum(PERMISSION_ACTIONS)),
})

export type PermissionScreen = z.infer<typeof permissionScreenSchema>

export const permissionKey = (screenCode: string, action: PermissionAction) =>
  `${screenCode}:${action}`

/**
 * Marca o desmarca una acción de una pantalla.
 * - Marcar cualquier acción marca también "Ver".
 * - Desmarcar "Ver" quita todas las acciones de esa pantalla.
 */
export function togglePermission(
  current: string[],
  screenCode: string,
  action: PermissionAction,
  checked: boolean,
): string[] {
  const next = new Set(current)
  if (checked) {
    next.add(permissionKey(screenCode, action))
    if (action !== "view") next.add(permissionKey(screenCode, "view"))
  } else if (action === "view") {
    for (const item of PERMISSION_ACTIONS) next.delete(permissionKey(screenCode, item))
  } else {
    next.delete(permissionKey(screenCode, action))
  }
  return Array.from(next).sort()
}

/** Pantallas que tienen alguna acción marcada pero no "Ver" (combinación sin sentido) */
export function findScreensWithoutView(permissions: string[]): string[] {
  const withView = new Set<string>()
  const withAny = new Set<string>()
  for (const permission of permissions) {
    const [screen, action] = permission.split(":")
    if (!screen) continue
    withAny.add(screen)
    if (action === "view") withView.add(screen)
  }
  return Array.from(withAny).filter((screen) => !withView.has(screen))
}

export interface PermissionModuleGroup {
  module: string
  module_label: string
  screens: PermissionScreen[]
}

/** Agrupa las pantallas por módulo respetando el orden del catálogo */
export function groupByModule(screens: PermissionScreen[]): PermissionModuleGroup[] {
  const groups = new Map<string, PermissionModuleGroup>()
  for (const screen of screens) {
    const group = groups.get(screen.module)
    if (group) {
      group.screens.push(screen)
    } else {
      groups.set(screen.module, {
        module: screen.module,
        module_label: screen.module_label,
        screens: [screen],
      })
    }
  }
  return Array.from(groups.values())
}