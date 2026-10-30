import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { getErrorMessage, isApiError } from "@/shared/lib/api/errors"
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_TYPES_LABEL,
  MAX_FILE_SIZE_LABEL,
  formatFileSize,
  resolveMimeType,
  validateFile,
} from "../fileRules"
import { useUploadDocument } from "../hooks"
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  EMPTY_UPLOAD_FORM,
  documentInputSchema,
  uploadFormSchema,
  type EntityType,
  type UploadFormValues,
} from "../schema"
import { StorageUploadError } from "../service"

/** Operación a la que pertenece el documento (una venta, una compra...) */
export interface DocumentEntity {
  type: EntityType
  id: string
  /** Texto para el usuario, ej. "Factura F001-00000123" */
  label: string
}

interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sin entidad, el documento queda suelto en el repositorio */
  entity?: DocumentEntity
}

function UploadForm({ entity, onDone }: { entity?: DocumentEntity; onDone: () => void }) {
  const uploadDocument = useUploadDocument()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: EMPTY_UPLOAD_FORM,
  })

  const handleFile = (selected: File | null) => {
    setServerError(null)
    setFile(selected)
    if (!selected) {
      setFileError(null)
      return
    }
    setFileError(validateFile(selected))
    // Si todavía no escribió un nombre, se propone el del archivo
    if (getValues("name").trim() === "") setValue("name", selected.name, { shouldValidate: true })
  }

  const handleError = (error: unknown) => {
    if (error instanceof StorageUploadError) {
      setServerError("No se pudo subir el archivo. Inténtalo de nuevo.")
      return
    }
    // Errores por campo que devuelva el backend se muestran junto a su campo
    if (isApiError(error)) {
      for (const item of error.fieldErrors) {
        if (item.field === "name" || item.field === "category") {
          setError(item.field, { message: item.message })
        } else {
          setFileError(item.message)
        }
      }
    }
    setServerError(getErrorMessage(error))
  }

  const onSubmit = (values: UploadFormValues) => {
    setServerError(null)
    if (!file) {
      setFileError("Selecciona un archivo")
      return
    }
    const fileProblem = validateFile(file)
    if (fileProblem) {
      setFileError(fileProblem)
      return
    }
    // La relación con otra operación la fija el DocumentsPanel; desde el repositorio va sin relación
    const input = documentInputSchema.safeParse({
      name: values.name,
      category: values.category,
      entity_type: entity?.type ?? "",
      entity_id: entity?.id ?? "",
      mime_type: resolveMimeType(file),
      size: file.size,
    })
    if (!input.success) {
      setFileError(input.error.issues[0]?.message ?? "El archivo no es válido")
      return
    }
    uploadDocument.mutate(
      { input: input.data, file },
      { onSuccess: onDone, onError: handleError },
    )
  }

  const isPending = uploadDocument.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <Field id="file" label="Archivo" error={fileError ?? undefined}>
        <>
          <Input
            id="file"
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            disabled={isPending}
            aria-invalid={!!fileError}
            aria-describedby={fileError ? "file-error" : "file-help"}
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
          <p id="file-help" className="text-sm text-muted-foreground">
            {ALLOWED_TYPES_LABEL}. Máximo {MAX_FILE_SIZE_LABEL}.
            {file && !fileError ? ` Seleccionado: ${formatFileSize(file.size)}.` : ""}
          </p>
        </>
      </Field>

      <Field id="name" label="Nombre del documento" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="off"
          disabled={isPending}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
      </Field>

      <Field id="category" label="Categoría">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || fileError !== null}>
          {isPending ? "Subiendo..." : "Subir documento"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function UploadDocumentDialog({ open, onOpenChange, entity }: UploadDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>
            {entity ? `Se adjuntará a ${entity.label}. ` : ""}
            El archivo se guarda de forma segura y solo se descarga con un enlace temporal.
          </DialogDescription>
        </DialogHeader>
        {/* El formulario solo existe mientras el diálogo está abierto: cada apertura
            parte de valores limpios, sin necesidad de reset manual */}
        {open && <UploadForm entity={entity} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}