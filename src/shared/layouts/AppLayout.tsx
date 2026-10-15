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
    <div className="min-h-svh">
      <Sidebar modules={modules} open={mobileMenuOpen} onClose={closeMobileMenu} />
      <div className="lg:pl-64 print:pl-0">
        <Topbar modules={modules} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
