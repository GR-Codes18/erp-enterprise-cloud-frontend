import { AdminFormDialog, type FormFieldConfig } from "../../shared/AdminFormDialog"
import { useCreateBackup, useUpdateBackup } from "../hooks"
import type { BackupRecord } from "../mock"
import { BACKUP_FREQUENCIES, EMPTY_BACKUP, backupFormSchema, backupToForm, type BackupFormValues } from "../schema"

const FIELDS: FormFieldConfig<BackupFormValues>[] = [
  {
    name: "frecuencia",
    label: "Frecuencia",
    type: "select",
    options: BACKUP_FREQUENCIES.map((value) => ({ value, label: value })),
  },
  {
    name: "destino",
    label: "Destino",
    placeholder: "s3://erp-backups-bucket/carpeta/",
    mono: true,
    hint: "Ruta donde se guarda el respaldo.",
  },
  {
    name: "politica_retencion",
    label: "Política de retención",
    placeholder: "Ej. 30 días",
    hint: "Cuánto tiempo se conservan los respaldos (días, semanas, meses o años).",
  },
]

interface BackupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear; un respaldo = editar */
  backup: BackupRecord | null
}

export function BackupFormDialog({ open, onOpenChange, backup }: BackupFormDialogProps) {
  const create = useCreateBackup()
  const update = useUpdateBackup()
  const isEdit = backup !== null

  return (
    <AdminFormDialog<BackupFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar respaldo" : "Nuevo respaldo"}
      description={
        isEdit
          ? "Modifica la programación. La última ejecución y el resultado los registra el sistema."
          : "Programa un respaldo de la base de datos."
      }
      isEdit={isEdit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear respaldo"}
      schema={backupFormSchema}
      defaultValues={backup ? backupToForm(backup) : EMPTY_BACKUP}
      fields={FIELDS}
      onSubmit={(values) =>
        backup ? update.mutateAsync({ id: backup.id, input: values }) : create.mutateAsync(values)
      }
    />
  )
}
