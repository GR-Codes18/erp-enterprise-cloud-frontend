import { useState } from "react"
import { Play, Plus } from "lucide-react"
import { useHasPermission } from "@/modules/auth"
import { Button } from "@/shared/components/ui/button"
import type { Column } from "@/shared/components/DataTable"
import { DateRangeFilter } from "@/shared/components/DateRangeFilter"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge, type StatusTone } from "@/shared/components/StatusBadge"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { BackupFormDialog } from "../backups/components/BackupFormDialog"
import { useBackups, useRemoveBackup, useRunBackup } from "../backups/hooks"
import { RowActions } from "../shared/RowActions"
import { useAdminDelete } from "../shared/useAdminDelete"
import type { BackupRecord } from "../backups/mock"

const RESULT_TONES: Record<BackupRecord["resultado"], StatusTone> = {
  Exitoso: "success",
  Fallido: "danger",
  "En proceso": "warning",
  Pendiente: "neutral",
}

const FREQUENCY_OPTIONS = ["Diaria", "Semanal", "Mensual"].map((value) => ({ value, label: value }))
const RESULT_OPTIONS = Object.keys(RESULT_TONES).map((value) => ({ value, label: value }))

export default function BackupsPage() {
  const list = useListFilters(["frecuencia", "resultado"] as const)
  const backups = useBackups(list.params)

  // Regla 1: el frontend oculta lo que no se permite (el backend vuelve a validar)
  const canCreate = useHasPermission("administration.backups:create")
  const canEdit = useHasPermission("administration.backups:edit")
  const canDelete = useHasPermission("administration.backups:void")
  const [dialog, setDialog] = useState<{ open: boolean; row: BackupRecord | null }>({ open: false, row: null })

  const removeBackup = useRemoveBackup()
  const runBackup = useRunBackup()
  const deletion = useAdminDelete<BackupRecord>({
    resourceName: "Respaldo",
    describe: (row) => `el respaldo ${row.frecuencia.toLowerCase()} en ${row.destino}`,
    remove: (row) => removeBackup.mutateAsync(row.id),
    // Los respaldos no tienen estado "inactivo": nunca responden "en uso"
    deactivate: async () => undefined,
  })

  const columns: Column<BackupRecord>[] = [
    { key: "frecuencia", header: "Frecuencia", cell: (row) => <span className="font-medium">{row.frecuencia}</span> },
    { key: "destino", header: "Destino", cell: (row) => <span className="font-mono text-sm">{row.destino}</span> },
    { key: "ultima_ejecucion", header: "Última ejecución", cell: (row) => (row.ultima_ejecucion ? formatDateTimeLima(row.ultima_ejecucion) : "—") },
    {
      key: "resultado",
      header: "Resultado",
      cell: (row) => <StatusBadge tone={RESULT_TONES[row.resultado]} label={row.resultado} />,
    },
    { key: "politica_retencion", header: "Política de retención", cell: (row) => row.politica_retencion },
    {
      key: "actions",
      header: "Acciones",
      className: "w-32",
      cell: (row) => (
        <RowActions
          label={`respaldo ${row.frecuencia.toLowerCase()} en ${row.destino}`}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => setDialog({ open: true, row })}
          onDelete={() => deletion.requestDelete(row)}
          extra={
            canEdit && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ejecutar ahora el respaldo ${row.frecuencia.toLowerCase()} en ${row.destino}`}
                title="Ejecutar ahora"
                disabled={runBackup.isPending}
                onClick={() => runBackup.mutate(row.id)}
              >
                <Play aria-hidden="true" />
              </Button>
            )
          }
        />
      ),
    },
  ]

  const newButton = canCreate && (
    <Button onClick={() => setDialog({ open: true, row: null })}>
      <Plus aria-hidden="true" />
      Nuevo respaldo
    </Button>
  )

  return (
    <>
    {deletion.errorBanner}
    <ListPageLayout
      actions={newButton}
      title="Respaldos de Base de Datos"
      description="Respaldos y recuperación: frecuencia, destino, última ejecución y política de retención."
      query={backups}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "Aún no hay respaldos", description: "Programa el primer respaldo de la base de datos.", action: newButton }}
      toolbar={
        <>
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por destino o retención"
            aria-label="Buscar respaldos"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por frecuencia"
            value={list.values.frecuencia}
            onChange={list.setFilter("frecuencia")}
            allLabel="Todas las frecuencias"
            options={FREQUENCY_OPTIONS}
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
    <BackupFormDialog
      open={dialog.open}
      backup={dialog.row}
      onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
    />
    {deletion.dialogs}
    </>
  )
}
