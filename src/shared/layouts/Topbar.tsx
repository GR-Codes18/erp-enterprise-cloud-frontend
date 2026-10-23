import { LogOut, Menu } from "lucide-react"
import { useLocation } from "react-router"
import { useAuth } from "@/modules/auth"
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
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl md:px-6 print:hidden">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="-ml-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 md:inline-flex">
            ERP
          </span>

          <nav aria-label="Ubicación" className="min-w-0 truncate text-sm text-slate-500">
            {breadcrumb?.subItemLabel ? (
              <>
                <span>{breadcrumb.moduleLabel}</span>
                <span className="mx-2 text-slate-400">/</span>
                <span>{breadcrumb.itemLabel}</span>
                <span className="mx-2 text-slate-400">/</span>
                <span className="font-semibold text-slate-900">{breadcrumb.subItemLabel}</span>
              </>
            ) : breadcrumb?.itemLabel ? (
              <>
                <span>{breadcrumb.moduleLabel}</span>
                <span className="mx-2 text-slate-400">/</span>
                <span className="font-semibold text-slate-900">{breadcrumb.itemLabel}</span>
              </>
            ) : (
              breadcrumb && <span className="font-semibold text-slate-900">{breadcrumb.moduleLabel}</span>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5 shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-semibold text-white shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {user?.name ?? "Usuario"}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}