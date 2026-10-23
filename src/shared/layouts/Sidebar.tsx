import { ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink, useLocation } from "react-router"
import { APP_NAME } from "@/config/app"
import { cn } from "@/shared/lib/utils"
import { findActiveModule } from "@/shared/lib/navigation"
import type { AppModule } from "@/shared/types/module"

interface SidebarProps {
  modules: AppModule[]
  /** Solo afecta a pantallas pequeñas, donde el menú es un panel deslizable */
  open: boolean
  onClose: () => void
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
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/80 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] text-sidebar-foreground shadow-[0_20px_50px_rgba(15,23,42,0.28)] transition-transform duration-200 lg:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border/80 px-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
            {APP_NAME.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-white">{APP_NAME}</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Enterprise</p>
          </div>
        </div>

        <nav
          aria-label="Navegación principal"
          className="flex-1 space-y-2 overflow-y-auto p-3"
        >
          {modules.map((module) => {
            const Icon = module.icon
            const basePath = "/" + module.basePath

            if (!module.sections) {
              return (
                <NavLink
                  key={module.id}
                  to={basePath}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/15 text-white ring-1 ring-inset ring-blue-400/30 shadow-sm"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
                    )
                  }
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
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActiveModule
                      ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/15 text-white ring-1 ring-inset ring-blue-400/30"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 text-left">{module.label}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <div
                    id={submenuId}
                    className="ml-3 mt-2 space-y-1 border-l border-slate-700/80 pl-3"
                  >
                    {module.sections.map((section, index) => (
                      <div key={section.label ?? index}>
                        {section.label && (
                          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {section.label}
                          </p>
                        )}
                        {section.items.map((item) => (
                          <NavLink
                            key={item.path}
                            to={basePath + "/" + item.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                              cn(
                                "block rounded-lg px-3 py-2 text-sm transition-colors",
                                isActive
                                  ? "bg-blue-500/15 text-white ring-1 ring-inset ring-blue-400/20"
                                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
                              )
                            }
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
