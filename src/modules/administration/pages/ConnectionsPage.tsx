import { useState } from "react"
import { Plus } from "lucide-react"
import { useHasPermission } from "@/modules/auth"
import { Button } from "@/shared/components/ui/button"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge, type StatusTone } from "@/shared/components/StatusBadge"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { ConnectionFormDialog } from "../connections/components/ConnectionFormDialog"
import { useConnections, usePatchConnection, useRemoveConnection } from "../connections/hooks"
import { RowActions } from "../shared/RowActions"
import { useAdminDelete } from "../shared/useAdminDelete"
import { useIntegrationFlows, useIntegrationNotifications } from "../integration/hooks"
import type { ConnectionRecord } from "../connections/mock"
import type { IntegrationNotification } from "../integration/types"
import { INTEGRATION_FLOWS, INTEGRATION_RULES, type IntegrationFlow } from "../connections/rules"

const STATE_TONES: Record<ConnectionRecord["estado"], StatusTone> = {
  Activo: "success",
  Inactivo: "neutral",
  Error: "danger",
}

const ENVIRONMENT_OPTIONS = ["Producción", "Pruebas / Sandbox"].map((value) => ({ value, label: value }))
const STATE_OPTIONS = Object.keys(STATE_TONES).map((value) => ({ value, label: value }))

export default function ConnectionsPage() {
  const list = useListFilters(["ambiente", "estado"] as const)
  const connections = useConnections(list.params)

  // Regla 1: el frontend oculta lo que no se permite (el backend vuelve a validar)
  const canCreate = useHasPermission("administration.connections:create")
  const canEdit = useHasPermission("administration.connections:edit")
  const canDelete = useHasPermission("administration.connections:void")
  const [dialog, setDialog] = useState<{ open: boolean; row: ConnectionRecord | null }>({ open: false, row: null })

  const removeConnection = useRemoveConnection()
  const patchConnection = usePatchConnection()
  const deletion = useAdminDelete<ConnectionRecord>({
    resourceName: "Conexión",
    describe: (row) => `la conexión ${row.proveedor} (${row.servicio})`,
    remove: (row) => removeConnection.mutateAsync(row.id),
    deactivate: (row) => patchConnection.mutateAsync({ id: row.id, input: { estado: "Inactivo" } }),
  })

  // Solo se muestra la referencia a las credenciales, nunca el secreto
  const columns: Column<ConnectionRecord>[] = [
    { key: "proveedor", header: "Proveedor", cell: (row) => <span className="font-medium">{row.proveedor}</span> },
    { key: "servicio", header: "Servicio", cell: (row) => row.servicio },
    { key: "ambiente", header: "Ambiente", cell: (row) => row.ambiente },
    {
      key: "credenciales_referenciadas",
      header: "Credenciales (referencia)",
      cell: (row) => <span className="font-mono text-sm">{row.credenciales_referenciadas}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge tone={STATE_TONES[row.estado]} label={row.estado} />,
    },
    { key: "ultima_respuesta", header: "Última respuesta", cell: (row) => row.ultima_respuesta },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      cell: (row) => (
        <RowActions
          label={`conexión ${row.proveedor}`}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => setDialog({ open: true, row })}
          onDelete={() => deletion.requestDelete(row)}
        />
      ),
    },
  ]

  const newButton = canCreate && (
    <Button onClick={() => setDialog({ open: true, row: null })}>
      <Plus aria-hidden="true" />
      Nueva conexión
    </Button>
  )

  const flowStats = useIntegrationFlows()
  const notifications = useIntegrationNotifications()
  const statsById = new Map((flowStats.data ?? []).map((stat) => [stat.id, stat]))

  const flowColumns: Column<IntegrationFlow>[] = [
    { key: "origen", header: "Origen", cell: (row) => <span className="font-medium">{row.origen}</span> },
    { key: "destino", header: "Destino", cell: (row) => row.destino },
    { key: "evento", header: "Evento / condición", cell: (row) => row.evento },
    { key: "accion_esperada", header: "Acción esperada", cell: (row) => row.accion_esperada },
    { key: "eventos", header: "Eventos procesados", cell: (row) => statsById.get(row.id)?.eventos ?? 0 },
    {
      key: "ultimo_evento",
      header: "Último evento",
      cell: (row) => {
        const last = statsById.get(row.id)?.ultimo_evento
        return last ? formatDateTimeLima(last) : "—"
      },
    },
  ]

  const notificationColumns: Column<IntegrationNotification>[] = [
    {
      key: "tipo",
      header: "Tipo",
      cell: (row) => (
        <StatusBadge
          tone={row.tipo === "approval" ? "warning" : "danger"}
          label={row.tipo === "approval" ? "Aprobación" : "Alerta"}
        />
      ),
    },
    { key: "titulo", header: "Evento", cell: (row) => <span className="font-medium">{row.titulo}</span> },
    { key: "detalle", header: "Detalle", cell: (row) => row.detalle },
    { key: "origen", header: "Origen", cell: (row) => row.origen },
    { key: "creada", header: "Fecha y hora", cell: (row) => formatDateTimeLima(row.creada) },
  ]

  return (
    <>
    {deletion.errorBanner}
    <ListPageLayout
      actions={newButton}
      title="Conexiones e Integraciones"
      description="Integraciones tributarias y bancarias según el alcance contratado."
      query={connections}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "Aún no hay conexiones", description: "Registra la primera integración contratada.", action: newButton }}
      toolbar={
        <>
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por proveedor, servicio o ambiente"
            aria-label="Buscar conexiones"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por ambiente"
            value={list.values.ambiente}
            onChange={list.setFilter("ambiente")}
            allLabel="Todos los ambientes"
            options={ENVIRONMENT_OPTIONS}
          />
          <FilterSelect
            label="Filtrar por estado"
            value={list.values.estado}
            onChange={list.setFilter("estado")}
            allLabel="Todos los estados"
            options={STATE_OPTIONS}
          />
        </>
      }
    />

      <section className="mt-5 space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5" aria-label="Reglas de integración">
        <h2 className="text-sm font-semibold text-slate-900">Reglas de integración</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          {INTEGRATION_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="mt-5 space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5" aria-label="Integración entre áreas">
        <h2 className="text-sm font-semibold text-slate-900">Integración entre áreas</h2>
        <p className="text-sm text-slate-600">
          Cada cambio en cualquier módulo se registra en la Bitácora y en Auditoría, y las aprobaciones y fallos generan alertas.
        </p>
        <DataTable columns={flowColumns} rows={INTEGRATION_FLOWS} getRowKey={(row) => row.id} />
      </section>

      <section className="mt-5 space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5" aria-label="Alertas y aprobaciones">
        <h2 className="text-sm font-semibold text-slate-900">Alertas y aprobaciones recientes</h2>
        <DataTable
          columns={notificationColumns}
          rows={notifications.data?.items ?? []}
          getRowKey={(row) => row.id}
          isLoading={notifications.isPending}
          empty={
            <EmptyState
              title="Sin alertas por ahora"
              description="Cuando otro módulo pida una aprobación o falle una operación, aparecerá aquí."
            />
          }
        />
      </section>
    <ConnectionFormDialog
        open={dialog.open}
        connection={dialog.row}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />
      {deletion.dialogs}
    </>
  )
}
