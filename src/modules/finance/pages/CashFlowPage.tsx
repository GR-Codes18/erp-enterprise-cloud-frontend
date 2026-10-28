import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { fromCents, toCents } from "@/shared/lib/money"
import { todayInLima } from "@/shared/lib/dates"
import { useBankAccounts, useCashSessions, usePayables, useReceivables } from "../hooks"
import type { Payable, Receivable } from "../accounts/schema"
import type { BankAccount } from "../banks/schema"
import type { CashSession } from "../cash/schema"
import { formatMoney } from "@/shared/lib/money"

const pageParams = { page: 1, size: 100 }

function sum(values: Array<{ balance: string }>): number {
  return values.reduce((total, item) => total + toCents(item.balance), 0)
}

function inThirtyDays<T extends Receivable | Payable>(accounts: T[]): T[] {
  const today = todayInLima()
  const limit = new Date(`${today}T00:00:00`)
  limit.setDate(limit.getDate() + 30)
  const lastDay = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, "0")}-${String(limit.getDate()).padStart(2, "0")}`
  return accounts.filter((account) => account.balance !== "0.00" && account.due_date >= today && account.due_date <= lastDay)
}

export default function CashFlowPage() {
  const receivables = useReceivables(pageParams)
  const payables = usePayables(pageParams)
  const sessions = useCashSessions({ ...pageParams, filters: { status: "open" } })
  const accounts = useBankAccounts(pageParams)
  const queries = [receivables, payables, sessions, accounts]

  if (queries.some((query) => query.isError)) {
    const failed = queries.find((query) => query.isError)
    return <ErrorState message="No se pudo calcular el flujo de caja." onRetry={() => void failed?.refetch()} />
  }

  const isPending = queries.some((query) => query.isPending)
  if (isPending) {
    return <PageHeader title="Flujo de caja" description="Cargando saldos y vencimientos..." />
  }

  const incoming = inThirtyDays(receivables.data?.items ?? [])
  const outgoing = inThirtyDays(payables.data?.items ?? [])
  const realCash = (sessions.data?.items ?? []).reduce((total: number, session: CashSession) => total + toCents(session.expected_amount), 0)
  const activeAccounts = (accounts.data?.items ?? []).filter((account: BankAccount) => account.status === "active")
  const realBank = activeAccounts.filter((account) => account.currency === "PEN").reduce((total, account) => total + toCents(account.balance), 0)
  const usdBank = activeAccounts.filter((account) => account.currency === "USD").reduce((total, account) => total + toCents(account.balance), 0)
  const balance = realCash + realBank
  const expectedIn = sum(incoming)
  const expectedOut = sum(outgoing)
  const metrics = [
    ["Periodo", "Próximos 30 días"],
    ["Saldo inicial", formatMoney(fromCents(balance))],
    ["Ingresos previstos", formatMoney(fromCents(expectedIn))],
    ["Egresos previstos", formatMoney(fromCents(expectedOut))],
    ["Saldo proyectado", formatMoney(fromCents(balance + expectedIn - expectedOut))],
    ["Saldo real", formatMoney(fromCents(balance))],
    ["Saldo bancario USD", formatMoney(fromCents(usdBank), "USD")],
  ]

  return (
    <>
      <PageHeader title="Flujo de caja" description="Proyección de liquidez basada en saldos bancarios, caja abierta y cuentas con vencimiento próximo." />
      <section aria-label="Proyección de flujo de caja" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </section>
      <p className="mt-4 text-sm text-muted-foreground">
        La proyección considera como previstos los documentos por cobrar y pagar con vencimiento dentro del periodo.
      </p>
    </>
  )
}
