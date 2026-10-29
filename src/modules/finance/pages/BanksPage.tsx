import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Link } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { useMasterCatalog, useMasterCatalogOptions } from "@/modules/maintenance"
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
  const currencies = useMasterCatalogOptions("currencies")
  const branches = useMasterCatalogOptions("branches")
  const hasCurrencies = currencies.data?.some((item) => item.value) ?? false
  const currenciesUnavailable =
    currencies.isPending || currencies.isError || !hasCurrencies
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
      ? { bank: account.bank, number: account.number, currency: account.currency, branch_id: account.branch_id ?? "", status: account.status }
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
      <Field id="branch_id" label="Sucursal (opcional)" error={errors.branch_id?.message}>
        <Controller
          control={control}
          name="branch_id"
          render={({ field }) => (
            <Select
              value={field.value || "none"}
              onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
              disabled={isPending || branches.isPending || branches.isError}
            >
              <SelectTrigger id="branch_id" className="w-full">
                <SelectValue placeholder="Sin sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin sucursal</SelectItem>
                {account?.branch_id && !branches.data?.some((item) => item.id === account.branch_id) && (
                  <SelectItem value={account.branch_id}>{account.branch_id} (no disponible)</SelectItem>
                )}
                {(branches.data ?? []).map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {branches.isError && <p role="alert" className="text-sm text-danger-text">{getErrorMessage(branches.error)}</p>}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="currency" label="Moneda">
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending || currenciesUnavailable || !!account}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {account?.currency && !currencies.data?.some((item) => item.value === account.currency) && (
                    <SelectItem value={account.currency}>
                      {CURRENCY_LABELS[account.currency] ?? `${account.currency} (inactiva)`}
                    </SelectItem>
                  )}
                  {(currencies.data ?? []).filter((item) => item.value).map((item) => (
                    <SelectItem key={item.id} value={item.value}>
                      {item.name} ({item.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {currencies.isError && <p role="alert" className="text-sm text-danger-text">{getErrorMessage(currencies.error)}</p>}
          {!currencies.isError && !currencies.isPending && !account && !hasCurrencies && (
            <p role="alert" className="text-sm text-danger-text">No hay monedas activas configuradas en Maestro.</p>
          )}
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
        <Button
          type="submit"
          disabled={isPending || (!account && currenciesUnavailable)}
        >
          {isPending ? "Guardando..." : account ? "Guardar cambios" : "Crear cuenta"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function BanksPage() {
  const list = useListFilters(["status", "currency"] as const)
  const accounts = useBankAccounts(list.params)
  const currencies = useMasterCatalogOptions("currencies")
  const branches = useMasterCatalog("branches", { page: 1, size: 100 })
  const canCreate = useHasPermission("finance.banks:create")
  const canEdit = useHasPermission("finance.banks:edit")
  // account se conserva al cerrar para que el título no cambie durante la animación
  const [dialog, setDialog] = useState<{ open: boolean; account: BankAccount | null }>({ open: false, account: null })

  const columns: Column<BankAccount>[] = [
    { key: "bank", header: "Banco", cell: (row) => <span className="font-medium">{row.bank}</span> },
    { key: "number", header: "Número", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    {
      key: "branch_id",
      header: "Sucursal",
      cell: (row) => branches.data?.items.find((branch) => branch.id === row.branch_id)?.name ?? (row.branch_id || "—"),
    },
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
              options={(currencies.data ?? []).filter((item) => item.value).map((item) => ({
                value: item.value,
                label: `${item.name} (${item.value})`,
              }))}
            />
            {currencies.isError && <p role="alert" className="text-sm text-danger-text">{getErrorMessage(currencies.error)}</p>}
            {branches.isError && <p role="alert" className="text-sm text-danger-text">{getErrorMessage(branches.error)}</p>}
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
