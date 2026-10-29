import { useState, type FormEvent } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge, type StatusTone } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate } from "@/shared/lib/dates"
import { FILTER_ALL } from "@/shared/lib/filters"
import { formatMoney } from "@/shared/lib/money"
import {
  commissionOperationInputSchema,
  commissionOperations,
  getCommissionFieldLabel,
  type CommissionOperation,
  type CommissionOperationDefinition,
  type CommissionOperationField,
  type CommissionOperationInput,
  type CommissionOperationRecord,
} from "../operations"
import {
  useCommissionOperations,
  useCreateCommissionOperation,
  useDeleteCommissionOperation,
  useUpdateCommissionOperation,
} from "../operationsHooks"

const PAGE_SIZE = 10
const STATUS_TONES: Record<string, StatusTone> = {
  active: "success",
  inactive: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  draft: "neutral",
  paid: "success",
  void: "danger",
}

function displayValue(definition: CommissionOperationDefinition, key: string, value: string) {
  const field = definition.fields.find((candidate) => candidate.key === key)
  if (!field) return value || "—"
  if (field.type === "date") return value ? formatBusinessDate(value) : "—"
  if (field.type === "money") return formatMoney(value)
  if (field.type === "percentage") return value ? `${value}%` : "—"
  return field.options?.find((option) => option.value === value)?.label ?? (value || "—")
}

function OperationForm({
  resource,
  record,
  onDone,
}: {
  resource: CommissionOperation
  record: CommissionOperationRecord | null
  onDone: () => void
}) {
  const definition = commissionOperations[resource]
  const create = useCreateCommissionOperation()
  const update = useUpdateCommissionOperation()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const pending = create.isPending || update.isPending

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setServerError(null)
    setFieldErrors({})
    const formData = new FormData(event.currentTarget)
    const input = Object.fromEntries(
      definition.fields.map((field) => [field.key, String(formData.get(field.key) ?? "").trim()]),
    ) as CommissionOperationInput
    const parsed = commissionOperationInputSchema(resource).safeParse(input)
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }

    try {
      if (record) {
        await update.mutateAsync({ resource, id: record.id, input })
      } else {
        await create.mutateAsync({ resource, input })
      }
      onDone()
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {definition.fields.map((field: CommissionOperationField) => {
          const id = `commission-${resource}-${field.key}`
          const value = record?.[field.key] ?? ""
          return (
            <Field key={field.key} id={id} label={field.label} error={fieldErrors[field.key]}>
              {field.type === "select" ? (
                <select
                  id={id}
                  name={field.key}
                  defaultValue={value || field.options?.[0]?.value}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  aria-invalid={Boolean(fieldErrors[field.key])}
                >
                  {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={id}
                  name={field.key}
                  defaultValue={value}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  aria-invalid={Boolean(fieldErrors[field.key])}
                />
              ) : (
                <Input
                  id={id}
                  name={field.key}
                  type={field.type === "period" ? "month" : field.type === "money" || field.type === "percentage" ? "text" : field.type}
                  inputMode={field.type === "money" || field.type === "percentage" || field.type === "number" ? "decimal" : undefined}
                  defaultValue={value}
                  aria-invalid={Boolean(fieldErrors[field.key])}
                />
              )}
            </Field>
          )
        })}
      </div>
      {serverError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">{serverError}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Guardando..." : record ? "Guardar cambios" : definition.createLabel}</Button>
      </DialogFooter>
    </form>
  )
}

function OperationDialog({
  resource,
  record,
  open,
  onOpenChange,
}: {
  resource: CommissionOperation
  record: CommissionOperationRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const definition = commissionOperations[resource]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{record ? `Editar: ${definition.title}` : definition.createLabel}</DialogTitle>
          <DialogDescription>{definition.description}</DialogDescription>
        </DialogHeader>
        {open && (
          <OperationForm
            key={record?.id ?? `${resource}-new`}
            resource={resource}
            record={record}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export function CommissionOperationPage({ resource }: { resource: CommissionOperation }) {
  const definition = commissionOperations[resource]
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState(FILTER_ALL)
  const search = useDebouncedValue(searchInput.trim(), 300)
  const records = useCommissionOperations(resource, {
    page,
    size: PAGE_SIZE,
    search,
    filters: status === FILTER_ALL ? {} : { status },
  })
  const remove = useDeleteCommissionOperation()
  const [dialog, setDialog] = useState<{ open: boolean; record: CommissionOperationRecord | null }>({
    open: false,
    record: null,
  })
  const [toDelete, setToDelete] = useState<CommissionOperationRecord | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const columns: Column<CommissionOperationRecord>[] = definition.columns.map((key) => ({
    key,
    header: getCommissionFieldLabel(definition, key),
    className: ["amount", "min_sales", "max_sales", "commission_amount", "adjustment_amount", "net_amount"].includes(key)
      ? "text-right"
      : undefined,
    cell: (row) => {
      if (key === "status") {
        return <StatusBadge tone={STATUS_TONES[row[key]] ?? "neutral"} label={displayValue(definition, key, row[key])} />
      }
      return displayValue(definition, key, row[key])
    },
  }))
  columns.push({
    key: "actions",
    header: "Acciones",
    className: "w-24",
    cell: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" aria-label={`Editar ${row[definition.fields[0].key]}`} onClick={() => setDialog({ open: true, record: row })}>
          <Pencil aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Eliminar ${row[definition.fields[0].key]}`} onClick={() => setToDelete(row)}>
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    ),
  })

  const createButton = (
    <Button onClick={() => setDialog({ open: true, record: null })}>
      <Plus aria-hidden="true" /> {definition.createLabel}
    </Button>
  )
  const statusOptions = definition.fields.find((field) => field.key === "status")?.options ?? []

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await remove.mutateAsync({ resource, id: toDelete.id })
      setActionError(null)
      setToDelete(null)
      if ((records.data?.items.length ?? 0) === 1 && page > 1) setPage(page - 1)
    } catch (error) {
      setActionError(getErrorMessage(error))
      setToDelete(null)
    }
  }

  return (
    <>
      <PageHeader title={definition.title} description={definition.description} actions={createButton} />
      <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Datos de demostración: los cambios se mantienen en memoria y se reinician al recargar la aplicación.
      </p>
      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Input
          type="search"
          className="w-full max-w-sm"
          placeholder={definition.searchPlaceholder}
          aria-label={`Buscar ${definition.title.toLowerCase()}`}
          value={searchInput}
          onChange={(event) => { setSearchInput(event.target.value); setPage(1) }}
        />
        {statusOptions.length > 0 && (
          <FilterSelect
            label="Filtrar por estado"
            value={status}
            onChange={(value) => { setStatus(value); setPage(1) }}
            allLabel="Todos los estados"
            options={statusOptions}
          />
        )}
      </div>
      {actionError && <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">{actionError}</p>}
      {records.isError ? (
        <ErrorState message={getErrorMessage(records.error)} onRetry={() => void records.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={records.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={records.isPending}
            empty={<EmptyState title={`No hay registros de ${definition.title.toLowerCase()}`} description="Ajusta los filtros o crea el primer registro." action={createButton} />}
          />
          <Pagination
            page={records.data?.page ?? 1}
            pages={records.data?.pages ?? 1}
            total={records.data?.total ?? 0}
            disabled={records.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
      <OperationDialog
        resource={resource}
        record={dialog.record}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => { if (!open) setToDelete(null) }}
        title={`Eliminar registro de ${definition.title.toLowerCase()}`}
        description="¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer."
        isLoading={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
