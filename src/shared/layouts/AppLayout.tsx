import { Outlet, useLocation } from "react-router"

/** Provisional: el Sidebar y la barra superior se agregan en la siguiente pieza. */
export default function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-svh">
      <header className="border-b border-border bg-card px-6 py-3 text-sm text-muted-foreground">
        Ruta actual: <code>{pathname}</code>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
