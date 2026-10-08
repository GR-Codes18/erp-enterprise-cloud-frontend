import { useState } from "react"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { getErrorMessage } from "@/shared/lib/api/errors"
import type { PageParams } from "@/shared/lib/api/types"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { useAuditEvents } from "../audit/hooks"
import {
  ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  AUDIT_RESULTS,
  FILTER_ALL,
  MODULE_LABELS,
  RESULT_LABELS,
  buildAuditFilters,
  isValidDateRange,
  type AuditEvent,
} from "../audit/schema"
import { useUserOptions } from "../usuarios/users/hooks"

const PAGE_SIZE = 10

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: { value: string; label: string }[]
  className?: string
}

function FilterSelect({ label, value, onChange, allLabel, options, className }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-44"} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const ACTION_OPTIONS = AUDIT_ACTIONS.map((value) => ({ value, label: ACTION_LABELS[value] }))
const MODULE_OPTIONS = AUDIT_MODULES.map((value) => ({ value, label: MODULE_LABELS[value] }))
const RESULT_OPTIONS = AUDIT_RESULTS.map((value) => ({ value, label: RESULT_LABELS[value] }))

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState(FILTER_ALL)
  const [moduleId, setModuleId] = useState(FILTER_ALL)
  const [action, setAction] = useState(FILTER_ALL)
  const [result, setResult] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const users = useUserOptions()

  // Un rango invertido no se envía (el backend respondería 422): se avisa junto al campo
  const rangeValid = isValidDateRange(dateFrom, dateTo)
  const filters = buildAuditFilters({
    user_id: userId,
    module: moduleId,
    action,
    result,
  })
  const params: PageParams = {
    page,
    size: PAGE_SIZE,
    filters,
    ...(rangeValid && dateFrom ? { date_from: dateFrom } : {}),
    ...(rangeValid && dateTo ? { date_to: dateTo } : {}),
  }

  const events = useAuditEvents(params)

  const hasFilters = Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  // Cada cambio de filtro vuelve a la página 1
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setUserId(FILTER_ALL)
    setModuleId(FILTER_ALL)
    setAction(FILTER_ALL)
    setResult(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const columns: Column<AuditEvent>[] = [
    {
      key: "created_at",
      header: "Fecha y hora",
      cell: (row) => formatDateTimeLima(row.created_at),
    },
    { key: "user", header: "Usuario", cell: (row) => <span className="font-medium">{row.user_name}</span> },
    { key: "action", header: "Acción", cell: (row) => ACTION_LABELS[row.action] },
    { key: "module", header: "Módulo", cell: (row) => MODULE_LABELS[row.module] },
    { key: "record", header: "Registro afectado", cell: (row) => row.record || "—" },
    {
      key: "result",
      header: "Resultado",
      cell: (row) => (
        <StatusBadge
          tone={row.result === "success" ? "success" : "danger"}
          label={RESULT_LABELS[row.result]}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Registro de lo que ocurre en el sistema. Solo lectura."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Filtrar por usuario"
          value={userId}
          onChange={withReset(setUserId)}
          allLabel="Todos los usuarios"
          options={users.data ?? []}
          className="w-56"
        />
        <FilterSelect
          label="Filtrar por módulo"
          value={moduleId}
          onChange={withReset(setModuleId)}
          allLabel="Todos los módulos"
          options={MODULE_OPTIONS}
        />
        <FilterSelect
          label="Filtrar por acción"
          value={action}
          onChange={withReset(setAction)}
          allLabel="Todas las acciones"
          options={ACTION_OPTIONS}
        />
        <FilterSelect
          label="Filtrar por resultado"
          value={result}
          onChange={withReset(setResult)}
          allLabel="Todos los resultados"
          options={RESULT_OPTIONS}
          className="w-44"
        />

        <Field id="date_from" label="Desde">
          <Input
            id="date_from"
            type="date"
            className="w-40"
            value={dateFrom}
            onChange={(event) => withReset(setDateFrom)(event.target.value)}
          />
        </Field>
        <Field
          id="date_to"
          label="Hasta"
          error={rangeValid ? undefined : "La fecha final no puede ser anterior a la inicial"}
        >
          <Input
            id="date_to"
            type="date"
            className="w-40"
            aria-invalid={!rangeValid}
            aria-describedby={rangeValid ? undefined : "date_to-error"}
            value={dateTo}
            onChange={(event) => withReset(setDateTo)(event.target.value)}
          />
        </Field>

        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {events.isError ? (
        <ErrorState message={getErrorMessage(events.error)} onRetry={() => void events.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={events.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={events.isPending}
            empty={
              hasFilters ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún registro coincide con los filtros elegidos."
                />
              ) : (
                <EmptyState
                  title="Aún no hay registros"
                  description="Las acciones del sistema aparecerán aquí."
                />
              )
            }
          />
          <Pagination
            page={events.data?.page ?? 1}
            pages={events.data?.pages ?? 1}
            total={events.data?.total ?? 0}
            disabled={events.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}