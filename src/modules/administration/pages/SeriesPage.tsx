import { useState } from "react"
import { Plus } from "lucide-react"
import { useHasPermission } from "@/modules/auth"
import { Button } from "@/shared/components/ui/button"
import type { Column } from "@/shared/components/DataTable"
import { FilterSelect } from "@/shared/components/FilterSelect"
import { ListPageLayout } from "@/shared/components/ListPageLayout"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Input } from "@/shared/components/ui/input"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { RowActions } from "../shared/RowActions"
import { useAdminDelete } from "../shared/useAdminDelete"
import { SeriesFormDialog } from "../series/components/SeriesFormDialog"
import { useDocumentSeries, usePatchSeries, useRemoveSeries } from "../series/hooks"
import type { DocumentSeries } from "../series/mock"
import { VIGENCIA_OPTIONS } from "../series/schema"

export default function SeriesPage() {
  const list = useListFilters(["vigencia"] as const)
  const series = useDocumentSeries(list.params)

  // Regla 1: el frontend oculta lo que no se permite (el backend vuelve a validar)
  const canCreate = useHasPermission("administration.series:create")
  const canEdit = useHasPermission("administration.series:edit")
  const canDelete = useHasPermission("administration.series:void")
  const [dialog, setDialog] = useState<{ open: boolean; row: DocumentSeries | null }>({ open: false, row: null })

  const removeSeries = useRemoveSeries()
  const patchSeries = usePatchSeries()
  const deletion = useAdminDelete<DocumentSeries>({
    resourceName: "Serie",
    describe: (row) => `la serie ${row.serie} de ${row.sucursal_id}`,
    remove: (row) => removeSeries.mutateAsync(row.id),
    deactivate: (row) => patchSeries.mutateAsync({ id: row.id, input: { vigencia: false } }),
  })

  const columns: Column<DocumentSeries>[] = [
    { key: "tipo_documento", header: "Tipo de documento", cell: (row) => <span className="font-medium">{row.tipo_documento}</span> },
    { key: "serie", header: "Serie", cell: (row) => <span className="font-mono text-sm">{row.serie}</span> },
    { key: "sucursal_id", header: "Sucursal", cell: (row) => row.sucursal_id },
    { key: "correlativo", header: "Correlativo", cell: (row) => <span className="font-mono text-sm">{row.correlativo}</span> },
    {
      key: "vigencia",
      header: "Vigencia",
      cell: (row) => <StatusBadge tone={row.vigencia ? "success" : "neutral"} label={row.vigencia ? "Vigente" : "No vigente"} />,
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      cell: (row) => (
        <RowActions
          label={`serie ${row.serie}`}
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
      Nueva serie
    </Button>
  )

  return (
    <>
    {deletion.errorBanner}
    <ListPageLayout
      actions={newButton}
      title="Series de Comprobantes"
      description="Tipos y series documentales por sucursal, con su correlativo y vigencia."
      query={series}
      columns={columns}
      getRowKey={(row) => row.id}
      hasFilters={list.hasFilters}
      onClearFilters={list.clear}
      onPageChange={list.setPage}
      empty={{ title: "Aún no hay series", description: "Crea la primera serie para emitir comprobantes.", action: newButton }}
      toolbar={
        <>
          <Input
            type="search"
            className="max-w-xs"
            placeholder="Buscar por tipo, serie o sucursal"
            aria-label="Buscar series"
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
          />
          <FilterSelect
            label="Filtrar por vigencia"
            value={list.values.vigencia}
            onChange={list.setFilter("vigencia")}
            allLabel="Todas las vigencias"
            options={VIGENCIA_OPTIONS}
          />
        </>
      }
    />
    <SeriesFormDialog
      open={dialog.open}
      series={dialog.row}
      onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
    />
    {deletion.dialogs}
    </>
  )
}
