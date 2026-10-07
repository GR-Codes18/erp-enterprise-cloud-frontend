import { LogOut, Menu } from "lucide-react"
import { useLocation } from "react-router"
import { useAuth } from "@/modules/auth/useAuth"
import { getBreadcrumb } from "@/shared/lib/navigation"
import type { AppModule } from "@/shared/types/module"

interface TopbarProps {
  modules: AppModule[]
  onMenuClick: () => void
}

export default function Topbar({ modules, onMenuClick }: TopbarProps) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
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
        {breadcrumb?.subItemLabel ? (
          <>
            <span className="text-muted-foreground">{breadcrumb.moduleLabel}</span>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="text-muted-foreground">{breadcrumb.itemLabel}</span>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="font-medium">{breadcrumb.subItemLabel}</span>
          </>
        ) : breadcrumb?.itemLabel ? (
          <>
            <span className="text-muted-foreground">{breadcrumb.moduleLabel}</span>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="font-medium">{breadcrumb.itemLabel}</span>
          </>
        ) : (
          breadcrumb && <span className="font-medium">{breadcrumb.moduleLabel}</span>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="hidden text-sm font-medium sm:inline">
            {user?.name ?? "Usuario"}
          </span>
        </div>

        <button
          type="button"
          onClick={logout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  )
}