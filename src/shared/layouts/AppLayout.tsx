import { useCallback, useState } from "react"
import { Outlet } from "react-router"
import Sidebar from "@/shared/layouts/Sidebar"
import Topbar from "@/shared/layouts/Topbar"
import type { AppModule } from "@/shared/types/module"

interface AppLayoutProps {
  modules: AppModule[]
}

export default function AppLayout({ modules }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  return (
    <div className="app-shell">
      <Sidebar modules={modules} open={mobileMenuOpen} onClose={closeMobileMenu} />
      <div className="lg:pl-64 print:pl-0">
        <Topbar modules={modules} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
          <div className="space-y-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
