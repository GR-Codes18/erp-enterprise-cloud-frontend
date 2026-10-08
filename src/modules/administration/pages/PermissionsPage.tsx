import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { getErrorMessage } from "@/shared/lib/api/errors"
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

export default function PermissionsPage() {
  const permissions = usePermissionCatalog()

  return (
    <>
      <PageHeader
        title="Permisos"
        description="Consulta las pantallas y acciones que se pueden asignar a cada rol."
      />

      {permissions.isError ? (
        <ErrorState
          message={getErrorMessage(permissions.error)}
          onRetry={() => void permissions.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={permissions.data ?? []}
          getRowKey={(row) => row.id}
          isLoading={permissions.isPending}
          empty={
            <EmptyState
              title="No hay permisos disponibles"
              description="El catálogo no contiene pantallas ni acciones."
            />
          }
        />
      )}
    </>
  )
}
