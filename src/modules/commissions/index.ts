import { HandCoins } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const commissionsModule: AppModule = {
  id: "commissions",
  label: "Comisiones de vendedores",
  icon: HandCoins,
  basePath: "commissions",
  sections: [
    {
      items: [
        {
          label: "Reglas de comisión",
          path: "rules",
          description: "Define los criterios y porcentajes para calcular las comisiones de los vendedores.",
          keyFields: ["código", "nombre", "criterio", "porcentaje", "vigencia"],
          page: () => import("./pages/CommissionRulesPage"),
        },
        {
          label: "Escalas y excepciones",
          path: "scales-exceptions",
          description: "Configura escalas por resultados y excepciones aplicables a las reglas de comisión.",
          keyFields: ["regla", "rango", "porcentaje", "excepción", "vigencia"],
          page: () => import("./pages/CommissionScalesPage"),
        },
        {
          label: "Comisión generada",
          path: "generated",
          description: "Consulta y administra las comisiones calculadas por vendedor y período.",
          keyFields: ["vendedor", "período", "ventas", "comisión", "estado"],
          page: () => import("./pages/CommissionsPage"),
        },
        {
          label: "Ajustes de comisión",
          path: "adjustments",
          description: "Registra ajustes y correcciones sobre las comisiones generadas.",
          keyFields: ["vendedor", "período", "motivo", "monto", "estado"],
          page: () => import("./pages/CommissionAdjustmentsPage"),
        },
        {
          label: "Liquidación",
          path: "settlements",
          description: "Revisa y prepara la liquidación de comisiones por período.",
          keyFields: ["período", "vendedor", "monto total", "fecha", "estado"],
          page: () => import("./pages/CommissionSettlementsPage"),
        },
        {
          label: "Pago de comisión",
          path: "payments",
          description: "Consulta y registra los pagos correspondientes a las comisiones liquidadas.",
          keyFields: ["liquidación", "vendedor", "monto", "fecha de pago", "estado"],
          page: () => import("./pages/CommissionPaymentsPage"),
        },
        {
          label: "Historial y reporte",
          path: "history-reports",
          description: "Consulta el historial de comisiones y sus reportes por vendedor y período.",
          keyFields: ["vendedor", "período", "comisión", "pago", "estado"],
          page: () => import("./pages/CommissionHistoryPage"),
        },
      ],
    },
  ],
}
