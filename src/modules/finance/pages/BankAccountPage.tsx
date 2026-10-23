import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Link, useParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
import type { Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate, todayInLima } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import {
  BANK_MOVEMENT_SOURCE_LABELS,
  BANK_MOVEMENT_TYPES,
  BANK_MOVEMENT_TYPE_LABELS,
  bankAccountLabel,
  bankMovementInputSchema,
  type BankAccount,
  type BankMovement,
  type BankMovementInput,
} from "../banks/schema"
import { useAddBankMovement, useBankAccounts, useBankMovements, useReconcileBankMovement } from "../hooks"

function MovementDialog({ account, open, onClose }: { account: BankAccount; open: boolean; onClose: () => void }) {
  const today = todayInLima()
  const add = useAddBankMovement()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BankMovementInput>({
    resolver: zodResolver(bankMovementInputSchema(today)),
    defaultValues: { type: "income", concept: "", amount: "", movement_date: today },
  })
  const type = useWatch({ control, name: "type" })
  const close = () => {
    reset()
    setServerError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimiento manual</DialogTitle>
          <DialogDescription>
            Los cobros y pagos por transferencia entran solos. Aquí se registran comisiones, depósitos y otros, con concepto.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit((values) => {
            setServerError(null)
            add.mutate({ accountId: account.id, input: values }, { onSuccess: close, onError: (error) => setServerError(getErrorMessage(error)) })
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="bank-movement-type" label="Tipo">
              <Select value={type} onValueChange={(value) => setValue("type", value as BankMovementInput["type"])} disabled={add.isPending}>
                <SelectTrigger id="bank-movement-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANK_MOVEMENT_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {BANK_MOVEMENT_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="movement_date" label="Fecha" error={errors.movement_date?.message}>
              <Input
                id="movement_date"
                type="date"
                max={today}
                disabled={add.isPending}
                aria-invalid={!!errors.movement_date}
                aria-describedby={errors.movement_date ? "movement_date-error" : undefined}
                {...register("movement_date")}
              />
            </Field>
          </div>
          <Field id="bank-concept" label="Concepto" error={errors.concept?.message}>
            <Input
              id="bank-concept"
              disabled={add.isPending}
              aria-invalid={!!errors.concept}
              aria-describedby={errors.concept ? "bank-concept-error" : undefined}
              {...register("concept")}
            />
          </Field>
          <Field id="bank-amount" label={`Monto (${account.currency})`} error={errors.amount?.message}>
            <Input
              id="bank-amount"
              inputMode="decimal"
              placeholder="0.00"
              disabled={add.isPending}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "bank-amount-error" : undefined}
              {...register("amount")}
            />
          </Field>
          {serverError && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
              {serverError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={add.isPending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function BankAccountPage() {
  const { id = "" } = useParams()
  const list = useListFilters(["type", "source"] as const)
  const movements = useBankMovements(id, list.params)
  // La cuenta se busca en el catálogo: no hay una ruta de detalle aparte
  const accounts = useBankAccounts({ page: 1, size: 100 })
  const account = accounts.data?.items.find((candidate) => candidate.id === id)
  const reconcile = useReconcileBankMovement()
  const canCreate = useHasPermission("finance.banks:create")
  const canEdit = useHasPermission("finance.banks:edit")
  const [movementOpen, setMovementOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const columns: Column<BankMovement>[] = [
    { key: "date", header: "Fecha", cell: (row) => formatBusinessDate(row.movement_date) },
    {
      key: "type",
      header: "Tipo",
      cell: (row) => <StatusBadge tone={row.type === "income" ? "success" : "warning"} label={BANK_MOVEMENT_TYPE_LABELS[row.type]} />,
    },
    { key: "concept", header: "Concepto", cell: (row) => row.concept },
    { key: "source", header: "Origen", cell: (row) => BANK_MOVEMENT_SOURCE_LABELS[row.source] },
    {
      key: "amount",
      header: "Monto",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono">
          {row.type === "expense" ? "−" : ""}
          {formatMoney(row.amount, account?.currency)}
        </span>
      ),
    },
    {
      key: "reconciled",
      header: "Conciliado",
      cell: (row) => (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={row.reconciled}
            disabled={!canEdit || reconcile.isPending}
            onChange={(event) => {
              setActionError(null)
              reconcile.mutate(
                { accountId: id, movementId: row.id, reconciled: event.target.checked },
                { onError: (error) => setActionError(getErrorMessage(error)) },
              )
            }}
          />
          {row.reconciled ? "Sí" : "No"}
        </label>
      ),
    },
  ]

  if (accounts.isSuccess && !account) {
    return <ErrorState message="No se encontró la cuenta bancaria." />
  }

  const actions = (
    <>
      {canCreate && account?.status === "active" && <Button onClick={() => setMovementOpen(true)}>Movimiento manual</Button>}
      <Button variant="outline" asChild>
        <Link to="/finance/banks">Volver a bancos</Link>
      </Button>
    </>
  )

  return (
    <>
      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}
      <ListPageLayout
        title={account ? bankAccountLabel(account) : "Movimientos de la cuenta"}
        description={account ? `Saldo según movimientos: ${formatMoney(account.balance, account.currency)}` : "Cargando la cuenta…"}
        actions={actions}
        query={movements}
        columns={columns}
        getRowKey={(row) => row.id}
        hasFilters={list.hasFilters}
        onClearFilters={list.clear}
        onPageChange={list.setPage}
        empty={{ title: "La cuenta aún no tiene movimientos", description: "Aparecen con los cobros y pagos por transferencia." }}
        toolbar={
          <>
            <Input
              type="search"
              className="max-w-xs"
              placeholder="Buscar por concepto"
              aria-label="Buscar movimientos"
              value={list.searchInput}
              onChange={(event) => list.setSearchInput(event.target.value)}
            />
            <FilterSelect
              label="Filtrar por tipo"
              value={list.values.type}
              onChange={list.setFilter("type")}
              allLabel="Ingresos y egresos"
              options={BANK_MOVEMENT_TYPES.map((value) => ({ value, label: BANK_MOVEMENT_TYPE_LABELS[value] }))}
            />
            <FilterSelect
              label="Filtrar por origen"
              value={list.values.source}
              onChange={list.setFilter("source")}
              allLabel="Todos los orígenes"
              options={(["manual", "payment"] as const).map((value) => ({ value, label: BANK_MOVEMENT_SOURCE_LABELS[value] }))}
            />
            <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
          </>
        }
      />
      {account && <MovementDialog account={account} open={movementOpen} onClose={() => setMovementOpen(false)} />}
    </>
  )
}
