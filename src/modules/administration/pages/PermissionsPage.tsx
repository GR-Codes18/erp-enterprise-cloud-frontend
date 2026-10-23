import { useMemo, useState } from "react"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { ExportCsvButton } from "@/shared/components/ExportCsvButton"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { FILTER_ALL } from "@/shared/lib/filters"
import { ACTION_LABELS, PERMISSION_ACTIONS, type PermissionScreen } from "../permissions/schema"
import { usePermissionCatalog } from "../permissions/hooks"

const columns: Column<PermissionScreen>[] = [
  {
    key: "module",
    header: "Módulo",
    cell: (row) => row.module_label,
  },
  {
    key: "screen",
    header: "Pantalla",
    cell: (row) => <span className="font-medium">{row.label}</span>,
  },
  {
    key: "code",
    header: "Código",
    cell: (row) => <code className="text-sm">{row.code}</code>,
  },
  {
    key: "actions",
    header: "Acciones disponibles",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {PERMISSION_ACTIONS.filter((action) => row.actions.includes(action)).map((action) => (
          <span key={action} className="rounded-md bg-muted px-2 py-1 text-xs">
            {ACTION_LABELS[action]}
          </span>
        ))}
      </div>
    ),
  },
]

const normalize = (text: string) => text.toLocaleLowerCase("es").trim()

export default function PermissionsPage() {
  const permissions = usePermissionCatalog()
  const [search, setSearch] = useState("")
  const [moduleId, setModuleId] = useState(FILTER_ALL)

  const catalog = useMemo(() => permissions.data ?? [], [permissions.data])

  const moduleOptions = useMemo(() => {
    const byModule = new Map<string, string>()
    for (const screen of catalog) byModule.set(screen.module, screen.module_label)
    return [...byModule].map(([value, label]) => ({ value, label }))
  }, [catalog])

  // El catálogo es pequeño y llega completo, por eso se filtra aquí y no en el servidor
  const rows = useMemo(() => {
    const needle = normalize(search)
    return catalog.filter((screen) => {
      if (moduleId !== FILTER_ALL && screen.module !== moduleId) return false
      if (!needle) return true
      return [screen.label, screen.code, screen.module_label].some((text) => normalize(text).includes(needle))
    })
  }, [catalog, search, moduleId])

  const hasFilters = search.trim() !== "" || moduleId !== FILTER_ALL

  return (
    <>
      <PageHeader
        title="Permisos"
        description="Consulta las pantallas y acciones que se pueden asignar a cada rol."
        actions={
          <ExportCsvButton
            filename="permisos"
            rows={rows}
            columns={[
              { header: "Módulo", value: (row) => row.module_label },
              { header: "Pantalla", value: (row) => row.label },
              { header: "Código", value: (row) => row.code },
              {
                header: "Acciones disponibles",
                value: (row) => PERMISSION_ACTIONS.filter((action) => row.actions.includes(action)).map((action) => ACTION_LABELS[action]).join(" | "),
              },
            ]}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="w-full max-w-sm">
          <Input
            type="search"
            placeholder="Buscar por pantalla, módulo o código"
            aria-label="Buscar permisos"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <FilterSelect
          label="Filtrar por módulo"
          value={moduleId}
          onChange={setModuleId}
          allLabel="Todos los módulos"
          options={moduleOptions}
        />
        {hasFilters && (
          <Button
            variant="outline"
            onClick={() => {
              setSearch("")
              setModuleId(FILTER_ALL)
            }}
          >
            Limpiar filtros
          </Button>
        )}
        {!permissions.isPending && !permissions.isError && (
          <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">
            {rows.length} de {catalog.length} pantallas
          </p>
        )}
      </div>

      {permissions.isError ? (
        <ErrorState
          message={getErrorMessage(permissions.error)}
          onRetry={() => void permissions.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          isLoading={permissions.isPending}
          empty={
            hasFilters ? (
              <EmptyState title="Sin resultados" description="Ninguna pantalla coincide con la búsqueda o el filtro." />
            ) : (
              <EmptyState
                title="No hay permisos disponibles"
                description="El catálogo no contiene pantallas ni acciones."
              />
            )
          }
        />
      )}
    </>
  )
}
