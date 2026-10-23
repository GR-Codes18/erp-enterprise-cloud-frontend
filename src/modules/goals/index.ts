import { Target } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const goalsModule: AppModule = {
  id: "goals",
  label: "Metas y Objetivos",
  icon: Target,
  basePath: "goals",
  page: () => import("./pages/GoalsOverviewPage"),
}
