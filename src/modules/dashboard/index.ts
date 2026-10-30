import { LayoutDashboard } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const dashboardModule: AppModule = {
  id: "dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  basePath: "dashboard",
  permission: "dashboard.summary:view",
  page: () => import("./pages/DashboardPage"),
}
