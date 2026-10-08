import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Field } from "@/shared/components/Field"
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
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { usePermissionCatalog } from "@/modules/administration/permissions/hooks"
import { PermissionsMatrix } from "./PermissionsMatrix"
import { useCreateRole, useUpdateRole } from "../hooks"
import {
  EMPTY_ROLE,
  roleInputSchema,
  type Role,
  type RoleInput,
} from "../schema"

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
}

function RoleForm({ role, onDone }: { role: Role | null; onDone: () => void }) {
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const isPending = createRole.isPending || updateRole.isPending
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<RoleInput>({
    resolver: zodResolver(roleInputSchema),
    defaultValues: role
      ? { name: role.name, description: role.description, permissions: role.permissions }
      : EMPTY_ROLE,
  })
  const permissionCatalog = usePermissionCatalog()
  const selectedPermissions = useWatch({ control, name: "permissions" })

  const handleError = (error: unknown) => {
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        setError(item.field as keyof RoleInput, { message: item.message })
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: RoleInput) => {
    setServerError(null)
    const options = { onSuccess: onDone, onError: handleError }
    if (role) {
      updateRole.mutate({ id: role.id, input: values }, options)
    } else {
      createRole.mutate(values, options)
    }
  }

  const readOnly = role?.is_system ?? false

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <Field id="name" label="Nombre" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          disabled={readOnly}
          {...register("name")}
        />
      </Field>

      <Field id="description" label="Descripción" error={errors.description?.message}>
        <Input
          id="description"
          autoComplete="off"
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "description-error" : undefined}
          disabled={readOnly}
          {...register("description")}
        />
      </Field>

      <Field id="permissions" label="Permisos">
        {permissionCatalog.isPending ? (
          <p className="text-sm text-muted-foreground">Cargando catálogo de permisos...</p>
        ) : permissionCatalog.isError ? (
          <div role="alert" className="grid gap-2">
            <p className="text-sm text-danger-text">{getErrorMessage(permissionCatalog.error)}</p>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => void permissionCatalog.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <PermissionsMatrix
            screens={permissionCatalog.data}
            value={selectedPermissions}
            disabled={readOnly}
            onChange={(permissions) =>
              setValue("permissions", permissions, { shouldDirty: true, shouldValidate: true })
            }
          />
        )}
      </Field>

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={onDone}>
          Cerrar
        </Button>
        {!readOnly && (
          <Button
            type="submit"
            disabled={isPending || permissionCatalog.isPending || permissionCatalog.isError}
          >
            {isPending ? "Guardando..." : role ? "Guardar cambios" : "Crear rol"}
          </Button>
        )}
      </DialogFooter>
    </form>
  )
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {role?.is_system ? "Ver rol" : role ? "Editar rol" : "Nuevo rol"}
          </DialogTitle>
          <DialogDescription>
            {role?.is_system
              ? "Los roles de sistema no se pueden modificar."
              : role
                ? "Modifica los datos del rol."
                : "Completa los datos del nuevo rol."}
          </DialogDescription>
        </DialogHeader>
        <RoleForm
          key={role?.id ?? "new"}
          role={role}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
