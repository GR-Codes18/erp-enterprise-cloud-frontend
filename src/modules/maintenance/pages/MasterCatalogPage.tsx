import { useState } from "react"
import { useLocation } from "react-router"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useHasPermission } from "@/modules/auth"
import type { Column } from "@/shared/components/DataTable"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { Field } from "@/shared/components/Field"
import { FilterSelect } from "@/shared/components/FilterSelect"
import InUseDialog from "@/shared/components/InUseDialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useListFilters } from "@/shared/hooks/useListFilters"
import { useDeleteOrDeactivate } from "@/shared/hooks/useDeleteOrDeactivate"
import { getErrorMessage } from "@/shared/lib/api/errors"
import {
  useCreateMasterCatalog,
  useDeleteMasterCatalog,
  useMasterCatalog,
  usePatchMasterCatalog,
  useUpdateMasterCatalog,
} from "../catalogs/hooks"
import {
  EMPTY_MASTER_CATALOG,
  MASTER_CATALOG_LABELS,
  MASTER_CATALOG_RESOURCES,
  masterCatalogInputSchema,
  type MasterCatalogInput,
  type MasterCatalogRecord,
  type MasterCatalogResource,
} from "../catalogs/schema"

const isCatalogResource = (value: string): value is MasterCatalogResource =>
  MASTER_CATALOG_RESOURCES.some((resource) => resource === value)

const errorText = (error: unknown) =>
  error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)
    ? String(error.issues[0]?.message ?? "Revisa los datos ingresados.")
    : null

export default function MasterCatalogPage() {
  const location = useLocation()
  const routeKey = location.pathname.split("/").filter(Boolean).at(-1) ?? "companies"
  const resource = isCatalogResource(routeKey) ? routeKey : "companies"
  const config = MASTER_CATALOG_LABELS[resource]
  const list = useListFilters(["status"] as const)
  const query = useMasterCatalog(resource, list.params)
  const create = useCreateMasterCatalog()
  const update = useUpdateMasterCatalog()
  const patch = usePatchMasterCatalog()
  const remove = useDeleteMasterCatalog()
  const canCreate = useHasPermission(`maintenance.${resource}:create`)
  const canEdit = useHasPermission(`maintenance.${resource}:edit`)
  const canDelete = useHasPermission(`maintenance.${resource}:delete`)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MasterCatalogRecord | null>(null)
  const [toDelete, setToDelete] = useState<MasterCatalogRecord | null>(null)
  const [form, setForm] = useState<MasterCatalogInput>(EMPTY_MASTER_CATALOG)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isPending = create.isPending || update.isPending
  const deletion = useDeleteOrDeactivate<MasterCatalogRecord>({
    resourceName: config.singular,
    onDelete: async (record) => {
      await remove.mutateAsync({ resource, id: record.id })
    },
    onDeactivate: async (record) => {
      await patch.mutateAsync({ resource, id: record.id, input: { status: "inactive" } })
    },
    onError: setActionError,
    onSuccess: () => setActionError(null),
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_MASTER_CATALOG })
    setValidationError(null)
    setActionError(null)
    setDialogOpen(true)
  }

  const openEdit = (record: MasterCatalogRecord) => {
    setEditing(record)
    setForm({
      code: record.code,
      name: record.name,
      detail: record.detail,
      status: record.status,
      value: record.value,
    })
    setValidationError(null)
    setActionError(null)
    setDialogOpen(true)
  }

  const save = () => {
    setValidationError(null)
    setActionError(null)
    const parsed = masterCatalogInputSchema.safeParse(form)
    if (!parsed.success) {
      setValidationError(errorText(parsed.error))
      return
    }
    if (
      (resource === "currencies" || resource === "units" || resource === "payment-methods") &&
      !parsed.data.value.trim()
    ) {
      setValidationError("Ingresa el valor que utilizarán los módulos relacionados.")
      return
    }

    const callbacks = {
      onSuccess: () => setDialogOpen(false),
      onError: (error: unknown) => setActionError(getErrorMessage(error)),
    }
    if (editing) update.mutate({ resource, id: editing.id, input: parsed.data }, callbacks)
    else create.mutate({ resource, input: parsed.data }, callbacks)
  }

  const toggleStatus = (record: MasterCatalogRecord) => {
    setActionError(null)
    patch.mutate(
      { resource, id: record.id, input: { status: record.status === "active" ? "inactive" : "active" } },
      { onError: (error) => setActionError(getErrorMessage(error)) },
    )
  }

  const deleteRecord = (record: MasterCatalogRecord) => {
    setActionError(null)
    setToDelete(record)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)
    await deletion.handleDelete(target)
  }

  const columns: Column<MasterCatalogRecord>[] = [
    { key: "code", header: "Código", cell: (row) => <span className="font-mono text-sm font-medium">{row.code}</span> },
    { key: "name", header: "Nombre", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "detail", header: "Detalle", cell: (row) => row.detail || "—" },
    ...(query.data?.items.some((row) => row.value) ? [
      { key: "value", header: "Valor usado en módulos", cell: (row: MasterCatalogRecord) => row.value || "—" },
    ] : []),
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <StatusBadge tone={row.status === "active" ? "success" : "neutral"} label={row.status === "active" ? "Activo" : "Inactivo"} />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-28",
      cell: (row) => (
        <div className="flex gap-1">
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" aria-label={`Editar ${row.name}`} onClick={() => openEdit(row)}>
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Cambiar estado de ${row.name}`}
                disabled={patch.isPending}
                onClick={() => toggleStatus(row)}
              >
                <span className="text-xs font-semibold">{row.status === "active" ? "Off" : "On"}</span>
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar ${row.name}`}
              disabled={deletion.isDeleting || remove.isPending}
              onClick={() => deleteRecord(row)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const actions = canCreate && (
    <Button onClick={openCreate}>
      <Plus aria-hidden="true" />
      Nueva {config.singular}
    </Button>
  )

  return (
    <>
      <ListPageLayout
        title={config.title}
        description={config.description}
        actions={actions}
        query={query}
        columns={columns}
        getRowKey={(row) => row.id}
        hasFilters={list.hasFilters}
        onClearFilters={list.clear}
        onPageChange={list.setPage}
        empty={{
          title: `Aún no hay ${config.title.toLocaleLowerCase()}`,
          description: "Crea un registro para que esté disponible en los módulos que lo utilizan.",
          action: actions,
        }}
        toolbar={
          <>
            <Input
              type="search"
              className="max-w-xs"
              placeholder="Buscar por código, nombre o detalle"
              aria-label={`Buscar ${config.title.toLocaleLowerCase()}`}
              value={list.searchInput}
              onChange={(event) => list.setSearchInput(event.target.value)}
            />
            <FilterSelect
              label="Filtrar por estado"
              value={list.values.status}
              onChange={list.setFilter("status")}
              allLabel="Todos los estados"
              options={[
                { value: "active", label: "Activo" },
                { value: "inactive", label: "Inactivo" },
              ]}
            />
          </>
        }
      />

      {actionError && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${config.singular}` : `Nueva ${config.singular}`}</DialogTitle>
            <DialogDescription>
              {editing ? "Actualiza el registro compartido con los demás módulos." : "Crea un registro disponible para los módulos que lo consumen."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field id="master-code" label="Código">
              <Input
                id="master-code"
                disabled={isPending}
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                placeholder="Ej. COD-001"
              />
            </Field>
            <Field id="master-name" label="Nombre">
              <Input
                id="master-name"
                disabled={isPending}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nombre del registro"
              />
            </Field>
            <Field id="master-detail" label="Detalle">
              <Input
                id="master-detail"
                disabled={isPending}
                value={form.detail}
                onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))}
                placeholder="Descripción o información adicional"
              />
            </Field>
            <Field
              id="master-value"
              label={`Valor de integración${["currencies", "units", "payment-methods"].includes(resource) ? "" : " (opcional)"}`}
            >
              <Input
                id="master-value"
                disabled={isPending}
                value={form.value}
                onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
                placeholder="Ej. USD, cash, UND"
              />
            </Field>
            <Field id="master-status" label="Estado">
              <Select
                value={form.status}
                onValueChange={(value) => setForm((current) => ({ ...current, status: value as MasterCatalogInput["status"] }))}
                disabled={isPending}
              >
                <SelectTrigger id="master-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(validationError || actionError) && (
              <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
                {validationError ?? actionError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={save}>
              {isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={`Eliminar ${config.singular}`}
        description={`¿Seguro que quieres eliminar "${toDelete?.name ?? ""}"? Si otros módulos lo utilizan, podrás desactivarlo en lugar de borrarlo.`}
        isLoading={deletion.isDeleting}
        onConfirm={() => void confirmDelete()}
      />
      <InUseDialog
        open={deletion.isInUseDialogOpen}
        onOpenChange={deletion.setIsInUseDialogOpen}
        resourceName={config.singular}
        message={deletion.inUseMessage}
        isPending={deletion.isDeactivating}
        onDeactivate={() => void deletion.handleConfirmDeactivate()}
      />
    </>
  )
}
