import { administrationModule } from "@/modules/administration"
import { dashboardModule } from "@/modules/dashboard"
import { documentsModule } from "@/modules/documents"
import { financeModule } from "@/modules/finance"
import { goalsModule } from "@/modules/goals"
import { inventoryModule } from "@/modules/inventory"
import { maintenanceModule } from "@/modules/maintenance"
import { purchasesModule } from "@/modules/purchases"
import { reportsModule } from "@/modules/reports"
import { salesModule } from "@/modules/sales"
import type { AppModule } from "@/shared/types/module"

/** El orden de este arreglo es el orden del Sidebar. */
export const appModules: AppModule[] = [
  dashboardModule,
  salesModule,
  purchasesModule,
  inventoryModule,
  financeModule,
  documentsModule,
  reportsModule,
  goalsModule,
  maintenanceModule,
  administrationModule,
]
