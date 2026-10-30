import { useState } from "react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import InUseDialog from "@/shared/components/InUseDialog"
import { useDeleteOrDeactivate } from "@/shared/hooks/useDeleteOrDeactivate"

interface AdminDeleteOptions<T> {
  /** "Serie", "Respaldo"... */
  resourceName: string
  describe: (row: T) => string
  remove: (row: T) => Promise<unknown>
  /** Si el registro está en uso (409) se ofrece desactivarlo con esta función */
  deactivate: (row: T) => Promise<unknown>
}

/**
 * Eliminar con confirmación. Si el servidor responde que el registro está en uso (409),
 * ofrece desactivarlo en lugar de borrarlo (mismo flujo que el resto de catálogos).
 */
export function useAdminDelete<T>({ resourceName, describe, remove, deactivate }: AdminDeleteOptions<T>) {
  const [toDelete, setToDelete] = useState<T | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const flow = useDeleteOrDeactivate<T>({
    resourceName,
    onDelete: async (item) => {
      await remove(item)
    },
    onDeactivate: async (item) => {
      await deactivate(item)
    },
    onError: (message) => setActionError(message),
    onSuccess: () => setActionError(null),
  })

  const confirmDelete = async () => {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)
    await flow.handleDelete(target)
  }

  const dialogs = (
    <>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={`Eliminar ${resourceName.toLowerCase()}`}
        description={`¿Seguro que quieres eliminar ${toDelete ? describe(toDelete) : ""}? Esta acción no se puede deshacer.`}
        isLoading={flow.isDeleting}
        onConfirm={confirmDelete}
      />
      <InUseDialog
        open={flow.isInUseDialogOpen}
        message={flow.inUseMessage}
        onOpenChange={flow.setIsInUseDialogOpen}
        resourceName={resourceName}
        isPending={flow.isDeactivating}
        onDeactivate={flow.handleConfirmDeactivate}
      />
    </>
  )

  const errorBanner = actionError ? (
    <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">
      {actionError}
    </p>
  ) : null

  return { requestDelete: setToDelete, dialogs, errorBanner, setActionError }
}
