import type { Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { formatDateTimeLima } from "@/shared/lib/dates"
import type { LogbookEntry } from "../logbook/mock"
import { useLogbookEntries } from "../logbook/hooks"

const RESULT_OPTIONS = [
  { value: "Exitoso", label: "Exitoso" },
  { value: "Fallido", label: "Fallido" },
]

export default function LogbookPage() {
  const list = useListFilters(["resultado"] as const)
  const entries = useLogbookEntries(list.params)

  const columns: Column<LogbookEntry>[] = [
    { key: "operacion_id", header: "Operación", cell: (row) => <span className="font-mono text-sm">{row.operacion_id}</span> },
    { key: "usuario", header: "Usuario", cell: (row) => <span className="font-medium">{row.usuario}</span> },
    { key: "accion", header: "Acción", cell: (row) => row.accion },
    { key: "fecha_hora", header: "Fecha y hora", cell: (row) => formatDateTimeLima(row.fecha_hora) },
    {
      key: "resultado",
      header: "Resultado",
      cell: (row) => <StatusBadge tone={row.resultado === "Exitoso" ? "success" : "danger"} label={row.resultado} />,
    },
    { key: "ip", header: "IP", cell: (row) => <span className="font-mono text-sm">{row.ip ?? "—"}</span> },
  ]

  return (
    <ListPageLayout
      title="Bitácora"
      description="Historial de operación: rastrea las acciones de negocio. Solo lectura."
      query={entries}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "Aún no hay operaciones", description: "Las acciones de negocio aparecerán aquí." }}
      toolbar={
        <>
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por operación, usuario, acción o IP"
            aria-label="Buscar en la bitácora"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por resultado"
            value={list.values.resultado}
            onChange={list.setFilter("resultado")}
            allLabel="Todos los resultados"
            options={RESULT_OPTIONS}
          />
          <DateRangeFilter from={list.dateFrom} to={list.dateTo} onFromChange={list.setDateFrom} onToChange={list.setDateTo} />
        </>
      }
    />
  )
}
