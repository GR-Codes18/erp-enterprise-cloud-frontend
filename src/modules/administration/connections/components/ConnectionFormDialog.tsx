import { AdminFormDialog, type FormFieldConfig } from "../../shared/AdminFormDialog"
import { useCreateConnection, useUpdateConnection } from "../hooks"
import type { ConnectionRecord } from "../mock"
import {
  CONNECTION_STATES,
  ENVIRONMENTS,
  EMPTY_CONNECTION,
  connectionFormSchema,
  connectionToForm,
  type ConnectionFormValues,
} from "../schema"

interface ConnectionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; una conexión = editar */
  connection: ConnectionRecord | null
}

export function ConnectionFormDialog({ open, onOpenChange, connection }: ConnectionFormDialogProps) {
  const create = useCreateConnection()
  const update = useUpdateConnection()
  const isEdit = connection !== null

  // "Error" lo fija el sistema cuando falla la conexión: solo se ofrece si la conexión ya está así
  const stateOptions = CONNECTION_STATES.filter((state) => state !== "Error" || connection?.estado === "Error")

  const fields: FormFieldConfig<ConnectionFormValues>[] = [
    { name: "proveedor", label: "Proveedor", placeholder: "Ej. SUNAT / OSE" },
    { name: "servicio", label: "Servicio", placeholder: "Ej. Emisión de Comprobantes Electrónicos" },
    {
      name: "ambiente",
      label: "Ambiente",
      type: "select",
      options: ENVIRONMENTS.map((value) => ({ value, label: value })),
    },
    {
      name: "credenciales_referenciadas",
      label: "Credenciales (referencia)",
      placeholder: "Ej. SECRET_SUNAT_PROD",
      mono: true,
      hint: "Nombre del secreto guardado en la bóveda de claves. Nunca escribas la clave aquí.",
    },
    {
      name: "estado",
      label: "Estado",
      type: "select",
      options: stateOptions.map((value) => ({ value, label: value })),
    },
  ]

  return (
    <AdminFormDialog<ConnectionFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar conexión" : "Nueva conexión"}
      description={
        isEdit
          ? "Modifica la integración. La última respuesta la registra el sistema."
          : "Registra una integración tributaria o bancaria según el alcance contratado."
      }
      isEdit={isEdit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear conexión"}
      schema={connectionFormSchema}
      defaultValues={connection ? connectionToForm(connection) : EMPTY_CONNECTION}
      fields={fields}
      onSubmit={(values) =>
        connection ? update.mutateAsync({ id: connection.id, input: values }) : create.mutateAsync(values)
      }
    />
  )
}
