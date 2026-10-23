import { ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink, useLocation } from "react-router"
import { APP_NAME } from "@/config/app"
import { cn } from "@/shared/lib/utils"
import { findActiveModule, joinModulePath } from "@/shared/lib/navigation"
import type { AppModule } from "@/shared/types/module"

interface SidebarProps {
  modules: AppModule[]
  /** Solo afecta a pantallas pequeñas, donde el menú es un panel deslizable */
  open: boolean
  onClose: () => void
}

function subItemClass({ isActive }: { isActive: boolean }) {
  return cn(
    "block rounded-md px-3 py-1.5 text-sm transition-colors",
    isActive
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  )
}

function singleLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  )
}

export default function Sidebar({ modules, open, onClose }: SidebarProps) {
  const { pathname } = useLocation()
  const activeModuleId = findActiveModule(modules, pathname)?.id ?? null

  // Acordeón: solo un módulo abierto a la vez. Por defecto se abre el módulo
  // de la URL actual; si la persona abre o cierra uno a mano, se respeta
  // hasta que navegue a otro módulo.
  const [override, setOverride] = useState<{
    activeId: string | null
    openId: string | null
  } | null>(null)

  const openId =
    override && override.activeId === activeModuleId
      ? override.openId
      : activeModuleId

  function toggle(moduleId: string) {
    setOverride({
      activeId: activeModuleId,
      openId: openId === moduleId ? null : moduleId,
    })
  }

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4 text-sm font-semibold text-sidebar-accent-foreground">
          {APP_NAME}
        </div>

        <nav
          aria-label="Navegación principal"
          className="flex-1 space-y-1 overflow-y-auto p-3"
        >
          {modules.map((module) => {
            const Icon = module.icon
            const basePath = joinModulePath(module.basePath)

            if (!module.sections) {
              return (
                <NavLink
                  key={module.id}
                  to={basePath}
                  onClick={onClose}
                  className={singleLinkClass}
                >
                  <Icon className="size-4 shrink-0" />
                  {module.label}
                </NavLink>
              )
            }

            const isOpen = openId === module.id
            const isActiveModule = activeModuleId === module.id
            const submenuId = "submenu-" + module.id

            return (
              <div key={module.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={submenuId}
                  onClick={() => toggle(module.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActiveModule
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 text-left">{module.label}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <div
                    id={submenuId}
                    className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-3"
                  >
                    {module.id === "logistics"
                      ? (
                          <div>
                            {module.sections
                              .flatMap((section) => section.items)
                              .filter((item) => !item.path.endsWith("/new") && !item.label.toLowerCase().startsWith("nuevo"))
                              .map((item) => (
                                <NavLink
                                  key={item.path}
                                  to={joinModulePath(module.basePath, item.path)}
                                  onClick={onClose}
                                  className={subItemClass}
                                >
                                  {item.label}
                                </NavLink>
                              ))}
                          </div>
                        )
                      : module.sections.map((section, index) => (
                          <div key={section.label ?? index}>
                            {section.label && (
                              <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-sidebar-muted">
                                {section.label}
                              </p>
                            )}
                            {section.items
                              .filter((item) => !item.path.endsWith("/new") && !item.label.toLowerCase().startsWith("nuevo"))
                              .map((item) => (
                                <NavLink
                                  key={item.path}
                                  to={joinModulePath(module.basePath, item.path)}
                                  onClick={onClose}
                                  className={subItemClass}
                                >
                                  {item.label}
                                </NavLink>
                              ))}
                          </div>
                        ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
