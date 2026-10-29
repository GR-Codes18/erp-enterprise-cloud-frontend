import { useState } from "react"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import type { Column } from "@/shared/components/DataTable"
import { ErrorState } from "@/shared/components/ErrorState"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { formatBusinessDate } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { BANK_MOVEMENT_SOURCE_LABELS, BANK_MOVEMENT_TYPE_LABELS, type BankMovement } from "../banks/schema"
import { useBankAccounts, useBankMovements, useReconcileBankMovement } from "../hooks"

export function BankMovementList({ reconciliation = false }: { reconciliation?: boolean }) {
  const accounts = useBankAccounts({ page: 1, size: 100 })
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const accountId = selectedAccountId || accounts.data?.items[0]?.id || ""
  const list = useListFilters(["type", "source"] as const)
  const movements = useBankMovements(accountId, list.params)
  const reconcile = useReconcileBankMovement()
  const canReconcile = useHasPermission(reconciliation ? "finance.reconciliation:edit" : "finance.banks:edit")
  const canCreateMovement = useHasPermission("finance.bank_movements:create")
  const [actionError, setActionError] = useState<string | null>(null)
  const account = accounts.data?.items.find((item) => item.id === accountId)
  const columns: Column<BankMovement>[] = [
    { key: "date", header: "Fecha", cell: (row) => formatBusinessDate(row.movement_date) },
    {
      key: "type",
      header: "Tipo",
      cell: (row) => <StatusBadge tone={row.type === "income" ? "success" : "warning"} label={BANK_MOVEMENT_TYPE_LABELS[row.type]} />,
    },
    { key: "concept", header: "Referencia / concepto", cell: (row) => row.concept },
    { key: "source", header: "Origen", cell: (row) => BANK_MOVEMENT_SOURCE_LABELS[row.source] },
    {
      key: "amount",
      header: "Importe",
      className: "text-right",
      cell: (row) => <span className="font-mono">{row.type === "expense" ? "−" : ""}{formatMoney(row.amount, account?.currency)}</span>,
    },
    {
      key: "reconciled",
      header: "Conciliado",
      cell: (row) =>
        reconciliation ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={row.reconciled}
              disabled={!canReconcile || !account || reconcile.isPending}
              onChange={(event) => {
                setActionError(null)
                reconcile.mutate(
                  { accountId, movementId: row.id, reconciled: event.target.checked },
                  { onError: (error) => setActionError(getErrorMessage(error)) },
                )
              }}
            />
            {row.reconciled ? "Sí" : "No"}
          </label>
        ) : row.reconciled ? "Sí" : "No",
    },
  ]

  if (accounts.isError) {
    return <ErrorState message={getErrorMessage(accounts.error)} onRetry={() => void accounts.refetch()} />
  }

  if (accounts.isPending) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando cuentas bancarias…</p>
  }

  return (
    <>
    {actionError && <p role="alert" className="mb-4 text-sm text-danger-text">{actionError}</p>}
    <ListPageLayout
      title={reconciliation ? "Conciliación bancaria" : "Movimientos bancarios"}
      description={
        reconciliation
          ? "Compara movimientos registrados en el ERP con el extracto bancario y marca los conciliados."
          : "Consulta depósitos, retiros y referencias de cada cuenta bancaria."
      }
      actions={
        !reconciliation && account && canCreateMovement && (
          <Button variant="outline" asChild>
            <Link to={`/finance/banks/${account.id}`}>Registrar movimiento</Link>
          </Button>
        )
      }
      query={movements}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "No hay movimientos bancarios", description: "Los movimientos por transferencia aparecerán aquí al ejecutarse." }}
      toolbar={
        <>
          <FilterSelect
            label="Cuenta bancaria"
            value={accountId}
            onChange={setSelectedAccountId}
            allLabel="Selecciona una cuenta"
            options={(accounts.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.bank} · ${item.number} · ${item.currency}` }))}
            className="w-72"
          />
          <FilterSelect
            label="Filtrar por tipo"
            value={list.values.type}
            onChange={list.setFilter("type")}
            allLabel="Todos los tipos"
            options={[
              { value: "income", label: BANK_MOVEMENT_TYPE_LABELS.income },
              { value: "expense", label: BANK_MOVEMENT_TYPE_LABELS.expense },
            ]}
          />
          <FilterSelect
            label="Filtrar por origen"
            value={list.values.source}
            onChange={list.setFilter("source")}
            allLabel="Todos los orígenes"
            options={[
              { value: "manual", label: BANK_MOVEMENT_SOURCE_LABELS.manual },
              { value: "payment", label: BANK_MOVEMENT_SOURCE_LABELS.payment },
            ]}
          />
        </>
      }
    />
    </>
  )
}

export default function BankMovementsPage() {
  return <BankMovementList />
}
