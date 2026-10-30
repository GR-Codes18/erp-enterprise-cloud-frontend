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
          label: "Cobros",
          path: "collections",
          permission: "finance.collections:view",
          description: "Registrar, aprobar y ejecutar cobros aplicados a documentos de clientes.",
          keyFields: ["cliente_id", "documento_cobro", "medio_pago", "cuenta_destino", "importe", "aplicaciones", "usuario", "estado"],
          page: () => import("./pages/CollectionsPage"),
        },
        {
          label: "Pagos a proveedores",
          path: "payments",
          permission: "finance.payments:view",
          description: "Registrar, aprobar y ejecutar pagos aplicados a facturas de proveedores.",
          keyFields: ["proveedor_id", "documento_pago", "fecha", "medio_pago", "cuenta_origen", "importe", "aplicaciones", "aprobador", "estado"],
          page: () => import("./pages/PaymentsPage"),
        },
        {
          label: "Cuentas por cobrar",
          path: "receivables",
          permission: "finance.receivables:view",
          description: "Controlar deuda de clientes y vencimientos por tramos de mora.",
          keyFields: ["cliente_id", "comprobante_id", "fecha_emisión", "vencimiento", "importe_original", "saldo", "días_mora", "estado"],
          page: () => import("./pages/ReceivablesPage"),
        },
        {
          label: "Cuentas por pagar",
          path: "payables",
          permission: "finance.payables:view",
          description: "Controlar obligaciones con proveedores y vencimientos por tramos de mora.",
          keyFields: ["proveedor_id", "factura_id", "fecha_emisión", "vencimiento", "importe_original", "saldo", "días_mora", "estado"],
          page: () => import("./pages/PayablesPage"),
        },
        {
          label: "Caja chica",
          path: "petty-cash",
          permission: "finance.cash_small:view",
          description: "Controlar fondos menores asignados, responsables y arqueos.",
          keyFields: ["caja_id", "sucursal_id", "responsable_id", "fondo_asignado", "fecha_apertura", "saldo", "arqueo", "estado"],
          page: () => import("./pages/PettyCashPage"),
        },
        {
          label: "Caja general",
          path: "cash",
          permission: "finance.cash:view",
          description: "Registrar ingresos y egresos mediante conceptos catalogados.",
          keyFields: ["caja_id", "fecha", "concepto_id", "tipo", "documento_referencia", "importe", "usuario", "saldo"],
          page: () => import("./pages/CashPage"),
          subRoutes: [{ label: "Sesión de caja", path: ":id", page: () => import("./pages/CashSessionPage") }],
        },
        {
          label: "Cuentas bancarias",
          path: "banks",
          permission: "finance.banks:view",
          description: "Administrar cuentas bancarias de la empresa y sus saldos.",
          keyFields: ["banco_id", "cuenta", "moneda_id", "sucursal_id", "saldo_inicial", "estado"],
          page: () => import("./pages/BanksPage"),
          subRoutes: [{
            label: "Movimientos de la cuenta",
            path: ":id",
            permission: "finance.bank_movements:view",
            page: () => import("./pages/BankAccountPage"),
          }],
        },
        {
          label: "Movimientos bancarios",
          path: "bank-movements",
          permission: "finance.bank_movements:view",
          description: "Registrar depósitos y retiros con su referencia y documento de origen.",
          keyFields: ["cuenta_id", "fecha", "tipo", "referencia", "importe", "moneda", "documento_origen", "estado"],
          page: () => import("./pages/BankMovementsPage"),
        },
        {
          label: "Conciliación bancaria",
          path: "reconciliation",
          permission: "finance.reconciliation:view",
          description: "Comparar los movimientos del ERP con los estados bancarios.",
          keyFields: ["cuenta_id", "periodo", "movimiento_ERP_id", "movimiento_banco_id", "diferencia", "fecha_conciliación", "responsable", "estado"],
          page: () => import("./pages/ReconciliationPage"),
        },
        {
          label: "Flujo de caja",
          path: "cash-flow",
          permission: "finance.cash_flow:view",
          description: "Proyectar la liquidez con ingresos y egresos previstos y reales.",
          keyFields: ["periodo", "saldo_inicial", "ingresos_previstos", "egresos_previstos", "saldo_proyectado", "saldo_real"],
          page: () => import("./pages/CashFlowPage"),
        },
        {
          label: "Letras, pagarés y cheques",
          path: "instruments",
          permission: "finance.instruments:view",
          description: "Controlar instrumentos financieros y sus fechas de vencimiento.",
          keyFields: ["tipo", "número", "tercero_id", "importe", "emisión", "vencimiento", "estado"],
          page: () => import("./pages/InstrumentsPage"),
        },
        {
          label: "Tributos y reportes financieros",
          path: "taxes",
          permission: "finance.taxes:view",
          description: "Dar seguimiento a tributos aplicables y su documentación financiera.",
          keyFields: ["tipo_tributo", "periodo", "base", "importe", "documento_origen", "estado"],
          page: () => import("./pages/TaxesPage"),
        },
        {
          label: "Estado de cuenta",
          path: "statements",
          permission: "finance.statements:view",
          page: () => import("./pages/StatementsPage"),
          hidden: true,
        },
      ],
    },
  ],
}
