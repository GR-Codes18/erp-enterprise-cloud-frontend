import { ChartColumn } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const reportsModule: AppModule = {
  id: "reports",
  label: "Reportes e Inteligencia de Negocios",
  icon: ChartColumn,
  basePath: "reports",
  page: () => import("./pages/ReportsBusinessIntelligencePage"),
}
