import { ChartColumn } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const reportsModule: AppModule = {
  id: "reports",
  label: "Reportes",
  icon: ChartColumn,
  basePath: "reports",
  sections: [
    {
      items: [
        {
          label: "Operativos",
          path: "operational",
          permission: "reports.operational:view",
          page: () => import("./pages/OperationalReportsPage"),
        },
        {
          label: "Analíticos",
          path: "analytical",
          permission: "reports.analytics:view",
          page: () => import("./pages/AnalyticalReportsPage"),
        },
      ],
    },
  ],
}
