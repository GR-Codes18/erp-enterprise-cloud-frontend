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
        { label: "Operativos", path: "operational" },
        { label: "Analíticos", path: "analytical" },
      ],
    },
  ],
}
