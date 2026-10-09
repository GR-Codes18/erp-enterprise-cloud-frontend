import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/modules/auth"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import { useRoleOptions } from "../../roles/hooks"
import { useCreateUser, useUpdateUser } from "../hooks"
import {
  EMPTY_USER,
  STATUS_LABELS,
  USER_STATUSES,
  toUserInput,
  userInputSchema,
  type User,
  type UserInput,
} from "../schema"

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; un usuario = editar */
  user: User | null
}

function UserForm({ user, onDone }: { user: User | null; onDone: () => void }) {
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const roles = useRoleOptions()
  const { user: sessionUser } = useAuth()
  const isSelf = user !== null && user.id === sessionUser?.id
  const isPending = createUser.isPending || updateUser.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UserInput>({
    resolver: zodResolver(userInputSchema),
    defaultValues: user ? toUserInput(user) : EMPTY_USER,
  })

  const handleError = (error: unknown) => {
    // Errores por campo que devuelva el backend (por ejemplo, correo duplicado) se muestran junto a su campo
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        setError(item.field as keyof UserInput, { message: item.message })
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: UserInput) => {
    setServerError(null)
    const options = { onSuccess: onDone, onError: handleError }
    if (user) {
      updateUser.mutate({ id: user.id, input: values }, options)
    } else {
      createUser.mutate(values, options)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <Field id="name" label="Nombre completo" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
      </Field>

      <Field id="email" label="Correo" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="off"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="role_id" label="Rol" error={errors.role_id?.message}>
          <Controller
            control={control}
            name="role_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={roles.isPending}
              >
                <SelectTrigger
                  id="role_id"
                  className="w-full"
                  aria-invalid={!!errors.role_id}
                  aria-describedby={errors.role_id ? "role_id-error" : undefined}
                >
                  <SelectValue
                    placeholder={roles.isPending ? "Cargando roles..." : "Selecciona un rol"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(roles.data ?? []).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field id="status" label="Estado">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                <SelectTrigger
                  id="status"
                  className="w-full"
                  aria-describedby={isSelf ? "status-self-hint" : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isSelf && (
            <p id="status-self-hint" className="text-xs text-muted-foreground">
              No puedes desactivar tu propio usuario.
            </p>
          )}
        </Field>
      </div>

      {roles.isError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {getErrorMessage(roles.error)}
        </p>
      )}

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : user ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {user ? "Modifica los datos del usuario." : "Completa los datos del nuevo usuario."}
          </DialogDescription>
        </DialogHeader>
        {/* El formulario solo existe mientras el diálogo está abierto: cada apertura
            parte de valores limpios, sin necesidad de reset manual */}
        <UserForm key={user?.id ?? "new"} user={user} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}