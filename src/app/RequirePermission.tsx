import { Navigate, Outlet } from "react-router"
import { useHasPermission } from "@/modules/auth"

/** Sin el permiso de la pantalla se va a /403. El backend vuelve a validar cada petición. */
export function RequirePermission({ permission }: { permission: string }) {
  const allowed = useHasPermission(permission)
  return allowed ? <Outlet /> : <Navigate to="/403" replace />
}
