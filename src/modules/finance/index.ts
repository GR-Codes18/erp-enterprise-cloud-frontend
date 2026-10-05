import { Wallet } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const financeModule: AppModule = {
  id: "finance",
  label: "Finanzas",
  icon: Wallet,
  basePath: "finance",
  sections: [
    {
      items: [
        { label: "Cuentas por cobrar", path: "receivables" },
        { label: "Cuentas por pagar", path: "payables" },
        { label: "Cobros y pagos", path: "payments" },
        { label: "Caja", path: "cash" },
        { label: "Bancos", path: "banks" },
        { label: "Estado de cuenta", path: "statements" },
      ],
    },
  ],
}
