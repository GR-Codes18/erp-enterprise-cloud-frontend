import { Navigate } from "react-router"
import { useAuth } from "@/modules/auth"
import { hasPermission } from "@/modules/auth/permissions"
import { filterModulesByPermission, firstPath } from "@/shared/lib/navigation"
import type { AppModule } from "@/shared/types/module"

/**
 * Lleva a la primera pantalla que la persona puede abrir: un almacenero no tiene Dashboard,
 * así que entrar a "/" (o a la raíz de un módulo) no debe terminar en 403.
 */
export function HomeRedirect({ modules }: { modules: AppModule[] }) {
  const { user } = useAuth()
  const target = firstPath(filterModulesByPermission(modules, (permission) => hasPermission(user, permission)))
  return <Navigate to={target ?? "/403"} replace />
}
