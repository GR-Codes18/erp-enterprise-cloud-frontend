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
        { label: "Usuarios", path: "users", permission: "administration.users.view" },
        { label: "Roles", path: "roles", permission: "administration.roles.view" },
        { label: "Permisos", path: "permissions", permission: "administration.permissions.view" },
        { label: "Auditoría", path: "audit", permission: "administration.audit.view" },
      ],
    },
    {
      label: "Configuración",
      items: [
        { label: "Parámetros Generales", path: "settings", permission: "administration.settings.view" },
        { label: "Series de Comprobantes", path: "series", permission: "administration.series.view" },
        { label: "Respaldos de Base de Datos", path: "backups", permission: "administration.backups.view" },
        { label: "Conexiones e Integraciones", path: "connections", permission: "administration.connections.view" },
      ],
    },
  ],
};