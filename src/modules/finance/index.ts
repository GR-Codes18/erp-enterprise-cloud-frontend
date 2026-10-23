import { Wallet } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

// Lo que este módulo publica para otros (regla 0.5): solo tipos y hooks de consulta
export { useDocumentPayments } from "./hooks"
export type { Payment } from "./payments/schema"

export const financeModule: AppModule = {
  id: "finance",
  label: "Tesorería",
  icon: Wallet,
  basePath: "finance",
  sections: [
    {
      items: [
        {
          label: "Cuentas por cobrar",
          path: "receivables",
          permission: "finance.receivables:view",
          page: () => import("./pages/ReceivablesPage"),
        },
        {
          label: "Cuentas por pagar",
          path: "payables",
          permission: "finance.payables:view",
          page: () => import("./pages/PayablesPage"),
        },
        {
          label: "Cobros y pagos",
          path: "payments",
          permission: "finance.payments:view",
          page: () => import("./pages/PaymentsPage"),
        },
        {
          label: "Caja",
          path: "cash",
          permission: "finance.cash:view",
          page: () => import("./pages/CashPage"),
          subRoutes: [{ label: "Sesión de caja", path: ":id", page: () => import("./pages/CashSessionPage") }],
        },
        {
          label: "Bancos",
          path: "banks",
          permission: "finance.banks:view",
          page: () => import("./pages/BanksPage"),
          subRoutes: [{ label: "Movimientos de la cuenta", path: ":id", page: () => import("./pages/BankAccountPage") }],
        },
        {
          label: "Estado de cuenta",
          path: "statements",
          permission: "finance.statements:view",
          page: () => import("./pages/StatementsPage"),
        },
      ],
    },
  ],
}
