import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import type { Column } from "@/shared/components/DataTable"
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
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { formatMoney } from "@/shared/lib/money"
import {
  BANK_ACCOUNT_STATUSES,
  BANK_ACCOUNT_STATUS_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
  EMPTY_BANK_ACCOUNT,
  bankAccountInputSchema,
  type BankAccount,
  type BankAccountInput,
} from "../banks/schema"
import { useBankAccounts, useCreateBankAccount, useUpdateBankAccount } from "../hooks"

function BankAccountForm({ account, onDone }: { account: BankAccount | null; onDone: () => void }) {
  const create = useCreateBankAccount()
  const update = useUpdateBankAccount()
  const isPending = create.isPending || update.isPending
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<BankAccountInput>({
    resolver: zodResolver(bankAccountInputSchema),
    defaultValues: account
      ? { bank: account.bank, number: account.number, currency: account.currency, status: account.status }
      : EMPTY_BANK_ACCOUNT,
  })

  const onSubmit = (values: BankAccountInput) => {
    setServerError(null)
    const options = {
      onSuccess: onDone,
      onError: (error: unknown) => {
        if (isApiError(error)) {
          for (const item of error.fieldErrors) {
            if (item.field === "number" || item.field === "bank") setError(item.field, { message: item.message })
          }
        }
        setServerError(getErrorMessage(error))
      },
    }
    if (account) update.mutate({ id: account.id, input: values }, options)
    else create.mutate(values, options)
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <Field id="bank" label="Banco" error={errors.bank?.message}>
        <Input id="bank" disabled={isPending} aria-invalid={!!errors.bank} aria-describedby={errors.bank ? "bank-error" : undefined} {...register("bank")} />
      </Field>
      <Field id="number" label="Número de cuenta" error={errors.number?.message}>
        <Input
          id="number"
          disabled={isPending}
          aria-invalid={!!errors.number}
          aria-describedby={errors.number ? "number-error" : undefined}
          {...register("number")}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="currency" label="Moneda">
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending || !!account}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {CURRENCY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id="status" label="Estado">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANK_ACCOUNT_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {BANK_ACCOUNT_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : account ? "Guardar cambios" : "Crear cuenta"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function BanksPage() {
  const list = useListFilters(["status", "currency"] as const)
  const accounts = useBankAccounts(list.params)
  const canCreate = useHasPermission("finance.banks:create")
  const canEdit = useHasPermission("finance.banks:edit")
  // account se conserva al cerrar para que el título no cambie durante la animación
  const [dialog, setDialog] = useState<{ open: boolean; account: BankAccount | null }>({ open: false, account: null })

  const columns: Column<BankAccount>[] = [
    { key: "bank", header: "Banco", cell: (row) => <span className="font-medium">{row.bank}</span> },
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "currency", header: "Moneda", cell: (row) => row.currency },
    {
      key: "balance",
      header: "Saldo",
      className: "text-right",
      cell: (row) => <span className="font-mono">{formatMoney(row.balance, row.currency)}</span>,
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={row.status === "active" ? "success" : "neutral"} label={BANK_ACCOUNT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "actions",
      header: "Acciones",
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="link" size="sm" asChild>
            <Link to={`/finance/banks/${row.id}`}>Movimientos</Link>
          </Button>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setDialog({ open: true, account: row })}>
              Editar
            </Button>
          )}
        </div>
      ),
    },
  ]

  const newButton = canCreate && <Button onClick={() => setDialog({ open: true, account: null })}>Nueva cuenta</Button>

  return (
    <>
      <ListPageLayout
        title="Bancos"
        description="Cuentas bancarias de la empresa. Una cuenta con movimientos no se borra: se desactiva."
        actions={newButton}
        query={accounts}
        columns={columns}
        getRowKey={(row) => row.id}
        hasFilters={list.hasFilters}
        onClearFilters={list.clear}
        onPageChange={list.setPage}
        empty={{ title: "Aún no hay cuentas bancarias", description: "Registra las cuentas de la empresa.", action: newButton }}
        toolbar={
          <>
            <Input
              type="search"
              className="max-w-xs"
              placeholder="Buscar por banco o número"
              aria-label="Buscar cuentas bancarias"
              value={list.searchInput}
              onChange={(event) => list.setSearchInput(event.target.value)}
            />
            <FilterSelect
              label="Filtrar por estado"
              value={list.values.status}
              onChange={list.setFilter("status")}
              allLabel="Todos los estados"
              options={BANK_ACCOUNT_STATUSES.map((value) => ({ value, label: BANK_ACCOUNT_STATUS_LABELS[value] }))}
            />
            <FilterSelect
              label="Filtrar por moneda"
              value={list.values.currency}
              onChange={list.setFilter("currency")}
              allLabel="Todas las monedas"
              options={CURRENCIES.map((value) => ({ value, label: CURRENCY_LABELS[value] }))}
            />
          </>
        }
      />

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.account ? "Editar cuenta bancaria" : "Nueva cuenta bancaria"}</DialogTitle>
            <DialogDescription>El saldo lo calculan los movimientos: no se edita.</DialogDescription>
          </DialogHeader>
          {dialog.open && (
            <BankAccountForm
              key={dialog.account?.id ?? "new"}
              account={dialog.account}
              onDone={() => setDialog((current) => ({ ...current, open: false }))}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
