import { useState } from "react"
import { Eye, Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { RoleFormDialog } from "../usuarios/roles/components/RoleFormDialog"
import { useDeleteRole, useRoles } from "../usuarios/roles/hooks"
import type { Role } from "../usuarios/roles/schema"

const PAGE_SIZE = 10

export default function RolesPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)

  // role se conserva al cerrar para que el título no cambie durante la animación
  const [dialog, setDialog] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  })
  const [toDelete, setToDelete] = useState<Role | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const roles = useRoles({ page, size: PAGE_SIZE, search })
  const deleteRole = useDeleteRole()

  const handleConfirmDelete = () => {
    if (!toDelete) return
    deleteRole.mutate(toDelete.id, {
      onSuccess: () => {
        // Si se borró el último de la página, se retrocede una
        if ((roles.data?.items.length ?? 0) === 1 && page > 1) setPage(page - 1)
        setToDelete(null)
      },
      onError: (error) => {
        // Por ejemplo, 409 si el rol tiene usuarios asignados
        setToDelete(null)
        setActionError(getErrorMessage(error))
      },
    })
  }

  const columns: Column<Role>[] = [
    {
      key: "name",
      header: "Rol",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.name}</span>
          {row.is_system && <StatusBadge tone="neutral" label="De sistema" />}
        </div>
      ),
    },
    { key: "description", header: "Descripción", cell: (row) => row.description || "—" },
    {
      key: "permissions",
      header: "Permisos",
      className: "text-right",
      cell: (row) => row.permissions.length,
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      cell: (row) =>
        row.is_system ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ver ${row.name}`}
            onClick={() => setDialog({ open: true, role: row })}
          >
            <Eye aria-hidden="true" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${row.name}`}
              onClick={() => setDialog({ open: true, role: row })}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar ${row.name}`}
              onClick={() => setToDelete(row)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ),
    },
  ]

  const newRoleButton = (
    <Button onClick={() => setDialog({ open: true, role: null })}>
      <Plus aria-hidden="true" />
      Nuevo rol
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Roles"
        description="Define qué puede hacer cada tipo de usuario en el sistema."
        actions={newRoleButton}
      />

      <div className="mb-4 max-w-sm">
        <Input
          type="search"
          placeholder="Buscar por nombre o descripción"
          aria-label="Buscar roles"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
            setPage(1)
          }}
        />
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      {roles.isError ? (
        <ErrorState message={getErrorMessage(roles.error)} onRetry={() => void roles.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={roles.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={roles.isPending}
            empty={
              search ? (
                <EmptyState title="Sin resultados" description="Ningún rol coincide con tu búsqueda." />
              ) : (
                <EmptyState
                  title="Aún no hay roles"
                  description="Crea el primero para empezar."
                  action={newRoleButton}
                />
              )
            }
          />
          <Pagination
            page={roles.data?.page ?? 1}
            pages={roles.data?.pages ?? 1}
            total={roles.data?.total ?? 0}
            disabled={roles.isFetching}
            onPageChange={setPage}
          />
        </>
      )}

      <RoleFormDialog
        open={dialog.open}
        role={dialog.role}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Eliminar rol"
        description={`¿Seguro que quieres eliminar el rol "${toDelete?.name ?? ""}"? Esta acción no se puede deshacer.`}
        isLoading={deleteRole.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}