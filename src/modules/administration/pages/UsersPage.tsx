import { useMemo, useState } from "react"
import { Pencil, Plus, UserCheck, UserX } from "lucide-react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
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
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { useRoleOptions } from "../usuarios/roles/hooks"
import { UserFormDialog } from "../usuarios/users/components/UserFormDialog"
import { useUpdateUser, useUsers } from "../usuarios/users/hooks"
import {
  STATUS_LABELS,
  USER_STATUSES,
  toUserInput,
  type User,
  type UserStatus,
} from "../usuarios/users/schema"

const PAGE_SIZE = 10
/** Valor centinela del filtro "todos": Radix Select no admite cadenas vacías como valor */
const ALL = "all"

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [status, setStatus] = useState<string>(ALL)
  const [roleFilter, setRoleFilter] = useState<string>(ALL)

  // user se conserva al cerrar para que el título no cambie durante la animación
  const [dialog, setDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })
  const [toDeactivate, setToDeactivate] = useState<User | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const filters: Record<string, string> = {}
  if (status !== ALL) filters.status = status
  if (roleFilter !== ALL) filters.role_id = roleFilter

  const users = useUsers({ page, size: PAGE_SIZE, search, filters })
  const updateUser = useUpdateUser()
  const roles = useRoleOptions()

  // El nombre del rol se resuelve en el cliente a partir de role_id
  const roleNames = useMemo(
    () => new Map((roles.data ?? []).map((option) => [option.value, option.label])),
    [roles.data],
  )

  const hasFilters = search !== "" || status !== ALL || roleFilter !== ALL

  // Un usuario no se borra: solo se activa o se desactiva (PUT con el recurso completo)
  const changeStatus = (user: User, next: UserStatus) => {
    setActionError(null)
    setTogglingId(user.id)
    updateUser.mutate(
      { id: user.id, input: { ...toUserInput(user), status: next } },
      {
        // El backend rechaza, por ejemplo, desactivarse a sí mismo o al último administrador (409)
        onError: (error) => setActionError(getErrorMessage(error)),
        onSettled: () => {
          setTogglingId(null)
          setToDeactivate(null)
        },
      },
    )
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Usuario",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: "email", header: "Correo", cell: (row) => row.email },
    {
      key: "role",
      header: "Rol",
      cell: (row) => roleNames.get(row.role_id) ?? "—",
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <StatusBadge
          tone={row.status === "active" ? "success" : "neutral"}
          label={STATUS_LABELS[row.status]}
        />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${row.name}`}
            onClick={() => setDialog({ open: true, user: row })}
          >
            <Pencil aria-hidden="true" />
          </Button>
          {row.status === "active" ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Desactivar ${row.name}`}
              disabled={togglingId === row.id}
              onClick={() => setToDeactivate(row)}
            >
              <UserX aria-hidden="true" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Activar ${row.name}`}
              disabled={togglingId === row.id}
              onClick={() => changeStatus(row, "active")}
            >
              <UserCheck aria-hidden="true" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const newUserButton = (
    <Button onClick={() => setDialog({ open: true, user: null })}>
      <Plus aria-hidden="true" />
      Nuevo usuario
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Administra quién accede al sistema y con qué rol."
        actions={newUserButton}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-sm">
          <Input
            type="search"
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setPage(1)
            }}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {USER_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-56" aria-label="Filtrar por rol">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los roles</SelectItem>
            {(roles.data ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      {users.isError ? (
        <ErrorState message={getErrorMessage(users.error)} onRetry={() => void users.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={users.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={users.isPending}
            empty={
              hasFilters ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún usuario coincide con tu búsqueda o filtros."
                />
              ) : (
                <EmptyState
                  title="Aún no hay usuarios"
                  description="Crea el primero para empezar."
                  action={newUserButton}
                />
              )
            }
          />
          <Pagination
            page={users.data?.page ?? 1}
            pages={users.data?.pages ?? 1}
            total={users.data?.total ?? 0}
            disabled={users.isFetching}
            onPageChange={setPage}
          />
        </>
      )}

      <UserFormDialog
        open={dialog.open}
        user={dialog.user}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={toDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setToDeactivate(null)
        }}
        title="Desactivar usuario"
        description={`¿Seguro que quieres desactivar a "${toDeactivate?.name ?? ""}"? No podrá ingresar al sistema hasta que lo actives de nuevo.`}
        isLoading={updateUser.isPending}
        onConfirm={() => {
          if (toDeactivate) changeStatus(toDeactivate, "inactive")
        }}
      />
    </>
  )
}