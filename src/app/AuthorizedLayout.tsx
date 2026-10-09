import { useMemo } from "react"
import { useAuth } from "@/modules/auth"
import { hasPermission } from "@/modules/auth/permissions"
import AppLayout from "@/shared/layouts/AppLayout"
import { filterModulesByPermission } from "@/shared/lib/navigation"
import type { AppModule } from "@/shared/types/module"

/** El menú solo muestra las pantallas que la persona en sesión puede abrir */
export function AuthorizedLayout({ modules }: { modules: AppModule[] }) {
  const { user } = useAuth()
  const visible = useMemo(
    () => filterModulesByPermission(modules, (permission) => hasPermission(user, permission)),
    [modules, user],
  )
  return <AppLayout modules={visible} />
}
