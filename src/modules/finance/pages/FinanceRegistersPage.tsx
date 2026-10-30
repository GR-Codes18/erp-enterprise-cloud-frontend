import { useState, type FormEvent } from "react"
import type { Column } from "@/shared/components/DataTable"
import { DataTable } from "@/shared/components/DataTable"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Field } from "@/shared/components/Field"
import { Input } from "@/shared/components/ui/input"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { useHasPermission } from "@/modules/auth"
import {
  INSTRUMENT_STATUS_LABELS,
  INSTRUMENT_TYPE_LABELS,
  TAX_STATUS_LABELS,
  type FinanceRegisterInput,
  type FinanceRegisterKind,
  type FinanceRegisterRecord,
  type InstrumentInput,
  type TaxInput,
} from "../registers"
import { useCreateFinanceRegister, useFinanceRegisters, useUpdateFinanceRegisterStatus } from "../registerHooks"

function FinanceRegisterForm({ kind, onDone }: { kind: FinanceRegisterKind; onDone: () => void }) {
  const create = useCreateFinanceRegister()
  const [error, setError] = useState<string | null>(null)
  const [instrument, setInstrument] = useState<InstrumentInput>({
    type: "letter",
    number: "",
    third_party: "",
    amount: "",
    issue_date: "",
    due_date: "",
  })
  const [tax, setTax] = useState<TaxInput>({ tax_type: "", period: "", base: "", amount: "", document_origin: "" })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const input: FinanceRegisterInput = kind === "instruments" ? instrument : tax
    create.mutate({ kind, input }, {
      onSuccess: onDone,
      onError: (reason) => setError(getErrorMessage(reason)),
    })
  }

  return (
    <form className="mb-5 grid gap-3 rounded-lg border p-4 sm:grid-cols-2" onSubmit={submit}>
      {kind === "instruments" ? (
        <>
          <Field id="instrument-type" label="Tipo">
            <select id="instrument-type" className="h-10 rounded-md border bg-background px-3" value={instrument.type} onChange={(event) => setInstrument({ ...instrument, type: event.target.value as InstrumentInput["type"] })}>
              {Object.entries(INSTRUMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field id="instrument-number" label="Número"><Input id="instrument-number" required value={instrument.number} onChange={(event) => setInstrument({ ...instrument, number: event.target.value })} /></Field>
          <Field id="instrument-third-party" label="Tercero"><Input id="instrument-third-party" required value={instrument.third_party} onChange={(event) => setInstrument({ ...instrument, third_party: event.target.value })} /></Field>
          <Field id="instrument-amount" label="Importe"><Input id="instrument-amount" required inputMode="decimal" value={instrument.amount} onChange={(event) => setInstrument({ ...instrument, amount: event.target.value })} /></Field>
          <Field id="instrument-issue-date" label="Emisión"><Input id="instrument-issue-date" required type="date" value={instrument.issue_date} onChange={(event) => setInstrument({ ...instrument, issue_date: event.target.value })} /></Field>
          <Field id="instrument-due-date" label="Vencimiento"><Input id="instrument-due-date" required type="date" value={instrument.due_date} onChange={(event) => setInstrument({ ...instrument, due_date: event.target.value })} /></Field>
        </>
      ) : (
        <>
          <Field id="tax-type" label="Tipo de tributo"><Input id="tax-type" required value={tax.tax_type} onChange={(event) => setTax({ ...tax, tax_type: event.target.value })} /></Field>
          <Field id="tax-period" label="Periodo"><Input id="tax-period" required placeholder="AAAA-MM" value={tax.period} onChange={(event) => setTax({ ...tax, period: event.target.value })} /></Field>
          <Field id="tax-base" label="Base"><Input id="tax-base" required inputMode="decimal" value={tax.base} onChange={(event) => setTax({ ...tax, base: event.target.value })} /></Field>
          <Field id="tax-amount" label="Importe"><Input id="tax-amount" required inputMode="decimal" value={tax.amount} onChange={(event) => setTax({ ...tax, amount: event.target.value })} /></Field>
          <Field id="tax-origin" label="Documento de origen"><Input id="tax-origin" required value={tax.document_origin} onChange={(event) => setTax({ ...tax, document_origin: event.target.value })} /></Field>
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger-text sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={create.isPending}>{create.isPending ? "Guardando..." : "Registrar"}</Button></div>
    </form>
  )
}

export function FinanceRegistersPage({ kind }: { kind: FinanceRegisterKind }) {
  const query = useFinanceRegisters(kind)
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const updateStatus = useUpdateFinanceRegisterStatus()
  const canCreate = useHasPermission(kind === "instruments" ? "finance.instruments:create" : "finance.taxes:create")
  const canEdit = useHasPermission(kind === "instruments" ? "finance.instruments:edit" : "finance.taxes:edit")
  const records = query.data?.items ?? []
  const instrumentMode = kind === "instruments"
  const title = instrumentMode ? "Letras, pagarés y cheques" : "Tributos y reportes financieros"
  const columns: Column<FinanceRegisterRecord>[] = instrumentMode
    ? [
        { key: "type", header: "Tipo", cell: (row) => "type" in row ? INSTRUMENT_TYPE_LABELS[row.type] : "—" },
        { key: "number", header: "Número", cell: (row) => "type" in row ? row.number : "—" },
        { key: "third_party", header: "Tercero", cell: (row) => "type" in row ? row.third_party : "—" },
        { key: "amount", header: "Importe", className: "text-right", cell: (row) => formatMoney(row.amount) },
        { key: "due_date", header: "Vencimiento", cell: (row) => "type" in row ? formatBusinessDate(row.due_date) : "—" },
        {
          key: "status",
          header: "Estado",
          cell: (row) => "type" in row
            ? <StatusBadge tone={row.status === "paid" ? "success" : row.status === "void" ? "danger" : "warning"} label={INSTRUMENT_STATUS_LABELS[row.status]} />
            : "—",
        },
        {
          key: "action",
          header: "Acción",
          cell: (row) => {
            return canEdit && "type" in row && row.status === "pending" ? (
              <Button size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => {
                setActionError(null)
                updateStatus.mutate({ kind, id: row.id, status: "paid" }, { onError: (error) => setActionError(getErrorMessage(error)) })
              }}>Marcar pagado</Button>
            ) : null
          },
        },
      ]
    : [
        { key: "tax_type", header: "Tributo", cell: (row) => "tax_type" in row ? row.tax_type : "—" },
        { key: "period", header: "Periodo", cell: (row) => "tax_type" in row ? row.period : "—" },
        { key: "base", header: "Base", className: "text-right", cell: (row) => "base" in row ? formatMoney(row.base) : "—" },
        { key: "amount", header: "Importe", className: "text-right", cell: (row) => formatMoney(row.amount) },
        { key: "document_origin", header: "Documento de origen", cell: (row) => "tax_type" in row ? row.document_origin : "—" },
        {
          key: "status",
          header: "Estado",
          cell: (row) => "tax_type" in row
            ? <StatusBadge tone={row.status === "paid" ? "success" : "warning"} label={TAX_STATUS_LABELS[row.status]} />
            : "—",
        },
        {
          key: "action",
          header: "Acción",
          cell: (row) => {
            return canEdit && "tax_type" in row && row.status === "pending" ? (
              <Button size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => {
                setActionError(null)
                updateStatus.mutate({ kind, id: row.id, status: "paid" }, { onError: (error) => setActionError(getErrorMessage(error)) })
              }}>Marcar pagado</Button>
            ) : null
          },
        },
      ]

  return (
    <>
      <PageHeader
        title={title}
        description={instrumentMode
          ? "Registra instrumentos financieros y controla sus vencimientos y estados."
          : "Registra obligaciones tributarias por periodo, importe y documento de origen."}
        actions={canCreate && <Button onClick={() => setShowForm((value) => !value)}>{showForm ? "Cerrar" : "Nuevo registro"}</Button>}
      />
      {showForm && <FinanceRegisterForm kind={kind} onDone={() => setShowForm(false)} />}
      {actionError && <p role="alert" className="mb-4 text-sm text-danger-text">{actionError}</p>}
      {query.isError ? <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} /> : (
        <DataTable
          columns={columns}
          rows={records}
          getRowKey={(row) => row.id}
          isLoading={query.isPending}
        />
      )}
    </>
  )
}
