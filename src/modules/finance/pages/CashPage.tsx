import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
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
import { useListFilters } from "@/shared/hooks/useListFilters"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { formatCents, formatMoney } from "@/shared/lib/money"
import {
  CASH_SESSION_STATUSES,
  CASH_SESSION_STATUS_LABELS,
  CASH_SESSION_STATUS_TONES,
  cashDifferenceCents,
  describeDifference,
  differenceText,
  openSessionSchema,
  type CashRegister,
  type CashSession,
  type OpenSessionInput,
} from "../cash/schema"
import { useCashRegisters, useCashSessions, useOpenCashSession } from "../hooks"

function OpenSessionDialog({ register, onClose }: { register: CashRegister | null; onClose: () => void }) {
  const navigate = useNavigate()
  const open = useOpenCashSession()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<OpenSessionInput>({
    resolver: zodResolver(openSessionSchema),
    values: { register_id: register?.id ?? "", opening_amount: "0.00" },
  })

  return (
    <Dialog open={register !== null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Abrir {register?.name}</DialogTitle>
          <DialogDescription>Una caja solo tiene una sesión abierta. Indica el efectivo con el que empieza.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit((values) => {
            setServerError(null)
            open.mutate(values, {
              onSuccess: (session) => navigate(`/finance/cash/${session.id}`),
              onError: (error) => setServerError(getErrorMessage(error)),
            })
          })}
        >
          <Field id="opening_amount" label="Monto inicial (S/)" error={errors.opening_amount?.message}>
            <Input
              id="opening_amount"
              inputMode="decimal"
              disabled={open.isPending}
              aria-invalid={!!errors.opening_amount}
              aria-describedby={errors.opening_amount ? "opening_amount-error" : undefined}
              {...field("opening_amount")}
            />
          </Field>
          {serverError && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
              {serverError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={open.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={open.isPending}>
              {open.isPending ? "Abriendo..." : "Abrir caja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CashPage() {
  const registers = useCashRegisters()
  const list = useListFilters(["status", "register_id"] as const)
  const sessions = useCashSessions(list.params)
  const canOpen = useHasPermission("finance.cash:create")
  const [toOpen, setToOpen] = useState<CashRegister | null>(null)

  const columns: Column<CashSession>[] = [
    { key: "number", header: "Sesión", cell: (row) => <span className="font-mono text-sm">{row.number}</span> },
    { key: "register", header: "Caja", cell: (row) => <span className="font-medium">{row.register_name}</span> },
    { key: "opened", header: "Apertura", cell: (row) => formatDateTimeLima(row.opened_at) },
    { key: "closed", header: "Cierre", cell: (row) => (row.closed_at ? formatDateTimeLima(row.closed_at) : "—") },
    { key: "expected", header: "Esperado", className: "text-right", cell: (row) => <span className="font-mono">{formatMoney(row.expected_amount)}</span> },
    {
      key: "difference",
      header: "Diferencia",
      cell: (row) => {
        if (row.status === "open") return "—"
        const cents = cashDifferenceCents(row.expected_amount, row.counted_amount)
        return <StatusBadge tone={describeDifference(cents).tone} label={differenceText(cents, formatCents)} />
      },
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={CASH_SESSION_STATUS_TONES[row.status]} label={CASH_SESSION_STATUS_LABELS[row.status]} />,
    },
    {
      key: "detail",
      header: "Detalle",
      cell: (row) => (
        <Button variant="link" size="sm" asChild>
          <Link to={`/finance/cash/${row.id}`}>Ver sesión</Link>
        </Button>
      ),
    },
  ]

  return (
    <>
      <section className="mb-8 grid gap-4 sm:grid-cols-2" aria-label="Cajas">
        {registers.isError ? (
          <ErrorState message={getErrorMessage(registers.error)} onRetry={() => void registers.refetch()} />
        ) : (
          (registers.data ?? []).map((register) => (
            <div key={register.id} className="flex items-center justify-between gap-3 rounded-md border p-4">
              <div>
                <p className="font-medium">{register.name}</p>
                <StatusBadge
                  tone={register.open_session_id ? "success" : "neutral"}
                  label={register.open_session_id ? "Sesión abierta" : "Cerrada"}
                />
              </div>
              {register.open_session_id ? (
                <Button asChild>
                  <Link to={`/finance/cash/${register.open_session_id}`}>Ir a la sesión</Link>
                </Button>
              ) : (
                canOpen && <Button onClick={() => setToOpen(register)}>Abrir caja</Button>
              )}
            </div>
          ))
        )}
      </section>

      <ListPageLayout
        title="Sesiones de caja"
        description="Cada sesión va de la apertura al cierre. Una sesión cerrada es solo lectura."
        query={sessions}
        columns={columns}
        getRowKey={(row) => row.id}
        hasFilters={list.hasFilters}
        onClearFilters={list.clear}
        onPageChange={list.setPage}
        empty={{ title: "Aún no hay sesiones de caja", description: "Abre una caja para empezar a registrar efectivo." }}
        toolbar={
          <>
            <FilterSelect
              label="Filtrar por estado"
              value={list.values.status}
              onChange={list.setFilter("status")}
              allLabel="Abiertas y cerradas"
              options={CASH_SESSION_STATUSES.map((value) => ({ value, label: CASH_SESSION_STATUS_LABELS[value] }))}
            />
            <FilterSelect
              label="Filtrar por caja"
              value={list.values.register_id}
              onChange={list.setFilter("register_id")}
              allLabel="Todas las cajas"
              options={(registers.data ?? []).map((register) => ({ value: register.id, label: register.name }))}
            />
            <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
          </>
        }
      />

      <OpenSessionDialog register={toOpen} onClose={() => setToOpen(null)} />
    </>
  )
}
