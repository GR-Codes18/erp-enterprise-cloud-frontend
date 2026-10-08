import { ShieldCheck } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const administrationModule: AppModule = {
  id: "administration",
  label: "Administración",
  icon: ShieldCheck,
  basePath: "administration",
  sections: [
    {
      label: "Seguridad",
      items: [
        { label: "Usuarios", path: "users", page: () => import("./pages/UsersPage") },
        { label: "Roles", path: "roles" },
        { label: "Permisos", path: "permissions" },
        { label: "Auditoría", path: "audit" },
      ],
    },
    {
      label: "Configuración",
      items: [{ label: "Parámetros", path: "settings" }],
    },
  ],
}