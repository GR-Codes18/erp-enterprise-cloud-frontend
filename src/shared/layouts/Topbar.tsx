import { Menu } from "lucide-react"
import { useLocation } from "react-router"
import { getBreadcrumb } from "@/shared/lib/navigation"
import type { AppModule } from "@/shared/types/module"

interface TopbarProps {
  modules: AppModule[]
  onMenuClick: () => void
}

export default function Topbar({ modules, onMenuClick }: TopbarProps) {
  const { pathname } = useLocation()
  const breadcrumb = getBreadcrumb(modules, pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="-ml-1 rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <nav aria-label="Ubicación" className="min-w-0 flex-1 truncate text-sm">
        {breadcrumb?.itemLabel ? (
          <>
            <span className="text-muted-foreground">{breadcrumb.moduleLabel}</span>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="font-medium">{breadcrumb.itemLabel}</span>
          </>
        ) : (
          breadcrumb && <span className="font-medium">{breadcrumb.moduleLabel}</span>
        )}
      </nav>

      {/* Provisional: se reemplaza cuando exista la sesión de usuario (módulo auth) */}
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          U
        </div>
        <span className="hidden text-sm sm:inline">Usuario</span>
      </div>
    </header>
  )
}
