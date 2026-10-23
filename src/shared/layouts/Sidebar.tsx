import { ChevronDown, Search, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
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

function subItemClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
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

/** Deja solo las pantallas cuyo nombre (o el del módulo) contiene el texto buscado */
function filterModulesByText(modules: AppModule[], text: string): AppModule[] {
  const needle = text.trim().toLocaleLowerCase("es")
  if (!needle) return modules
  const matches = (label: string) => label.toLocaleLowerCase("es").includes(needle)

  return modules.flatMap((module) => {
    if (!module.sections) return matches(module.label) ? [module] : []
    if (matches(module.label)) return [module]
    const sections = module.sections
      .map((section) => ({ ...section, items: section.items.filter((item) => matches(item.label)) }))
      .filter((section) => section.items.length > 0)
    return sections.length > 0 ? [{ ...module, sections }] : []
  })
}

export default function Sidebar({ modules: allModules, open, onClose }: SidebarProps) {
  const { pathname } = useLocation()
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const isSearching = query.trim() !== ""
  const modules = useMemo(() => filterModulesByText(allModules, query), [allModules, query])

  // Ctrl+K (o Cmd+K) lleva el cursor al buscador del menú
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])
  const activeModuleId = findActiveModule(allModules, pathname)?.id ?? null

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

        <div className="relative shrink-0 px-3 pt-3">
          <Search aria-hidden="true" className="pointer-events-none absolute left-6 top-1/2 mt-1.5 size-4 -translate-y-1/2 text-sidebar-muted" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("")
            }}
            placeholder="Buscar… (Ctrl+K)"
            aria-label="Buscar pantalla del menú"
            className="h-9 w-full rounded-md border border-sidebar-border bg-transparent pl-8 pr-8 text-sm text-sidebar-foreground placeholder:text-sidebar-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sidebar-primary"
          />
          {isSearching && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => setQuery("")}
              className="absolute right-5 top-1/2 mt-1.5 -translate-y-1/2 rounded p-1 text-sidebar-muted hover:text-sidebar-accent-foreground"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>

        <nav
          aria-label="Navegación principal"
          className="flex-1 space-y-1 overflow-y-auto p-3"
        >
          {isSearching && modules.length === 0 && (
            <p className="px-3 py-2 text-sm text-sidebar-muted">Ninguna pantalla coincide.</p>
          )}
          {modules.map((module) => {
            const Icon = module.icon
            const basePath = "/" + module.basePath

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

            const isOpen = isSearching || openId === module.id
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
                      ? "bg-sidebar-accent/40 text-sidebar-accent-foreground"
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
                    {module.sections.map((section, index) => (
                      <div key={section.label ?? index}>
                        {section.label && (
                          <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-sidebar-muted">
                            {section.label}
                          </p>
                        )}
                        {section.items.map((item) => (
                          <NavLink
                            key={item.path}
                            to={basePath + "/" + item.path}
                            onClick={onClose}
                            className={subItemClass}
                          >
                            {item.icon && <item.icon className="size-4 shrink-0" />}
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
