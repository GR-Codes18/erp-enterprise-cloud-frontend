import { Truck } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const logisticsModule: AppModule = {
  id: "logistics",
  label: "Logística y transporte",
  icon: Truck,
  basePath: "logistics",
  page: () => import("./pages/LogisticsPage"),
}
