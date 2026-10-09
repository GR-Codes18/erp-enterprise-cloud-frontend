import { ShieldCheck } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

// Lo que este módulo publica para otros (regla 0.5): solo tipos y hooks de consulta
export { useUserOptions } from "./usuarios/users/hooks"
export type { UserOption } from "./usuarios/users/hooks"

export const administrationModule: AppModule = {
  id: "administration",
  label: "Administración",
  icon: ShieldCheck,
  basePath: "administration",
  sections: [
    {
      label: "Seguridad",
      items: [
        { label: "Usuarios", path: "users", permission: "administration.users:view", page: () => import("./pages/UsersPage") },
        { label: "Roles", path: "roles", permission: "administration.roles:view", page: () => import("./pages/RolesPage") },
        { label: "Permisos", path: "permissions", permission: "administration.roles:view", page: () => import("./pages/PermissionsPage") },
        { label: "Auditoría", path: "audit", permission: "administration.audit:view", page: () => import("./pages/AuditPage") },
      ],
    },
    {
      label: "Configuración",
      items: [{ label: "Parámetros", path: "settings", permission: "administration.settings:view", page: () => import("./pages/SettingsPage") }],
    },
  ],
}