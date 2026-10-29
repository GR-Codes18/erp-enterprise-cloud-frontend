import { HandCoins } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const commissionsModule: AppModule = {
  id: "commissions",
  label: "Comisiones de vendedores",
  icon: HandCoins,
  basePath: "commissions",
  page: () => import("./pages/CommissionsPage"),
}
