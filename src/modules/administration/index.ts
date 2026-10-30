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
        { label: "Usuarios", path: "users", permission: "administration.users:view" },
        { label: "Roles", path: "roles", permission: "administration.roles:view" },
        { label: "Permisos", path: "permissions", permission: "administration.permissions:view" },
        { label: "Auditoría", path: "audit", permission: "administration.audit:view" },
        {
          label: "Bitácora",
          path: "logbook",
          page: () => import("./pages/LogbookPage"),
          permission: "administration.logbook:view",
          description: "Rastrea las acciones de negocio realizadas en el sistema.",
          keyFields: ["operacion_id", "usuario", "acción", "fecha_hora", "resultado", "IP_si_disponible"],
        },
      ],
    },
    {
      label: "Configuración",
      items: [
        { label: "Parámetros Generales", path: "settings", permission: "administration.settings:view" },
        {
          label: "Series de Comprobantes",
          path: "series",
          page: () => import("./pages/SeriesPage"),
          permission: "administration.series:view",
          description: "Configura los tipos de documento y sus series por sucursal.",
          keyFields: ["tipo_documento", "serie", "sucursal_id", "correlativo", "vigencia"],
        },
        {
          label: "Respaldos de Base de Datos",
          path: "backups",
          page: () => import("./pages/BackupsPage"),
          permission: "administration.backups:view",
          description: "Protege los datos con respaldos programados y recuperación.",
          keyFields: ["frecuencia", "destino", "última_ejecución", "resultado", "política_retención"],
        },
        {
          label: "Conexiones e Integraciones",
          path: "connections",
          page: () => import("./pages/ConnectionsPage"),
          permission: "administration.connections:view",
          description: "Gestiona las conexiones con proveedores y servicios externos.",
          keyFields: ["proveedor", "servicio", "ambiente", "credenciales_referenciadas", "estado", "última_respuesta"],
        },
      ],
    },
  ],
};