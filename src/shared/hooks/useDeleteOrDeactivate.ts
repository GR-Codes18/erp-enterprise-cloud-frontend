import { useState } from "react"
import { getErrorMessage } from "@/shared/lib/api/errors"

interface UseDeleteOrDeactivateOptions<T> {
  resourceName: string
  onDelete: (item: T) => Promise<void>
  onDeactivate: (item: T) => Promise<void>
  onSuccess?: () => void
  onError?: (message: string) => void
}

export function useDeleteOrDeactivate<T>({
  resourceName,
  onDelete,
  onDeactivate,
  onSuccess,
  onError,
}: UseDeleteOrDeactivateOptions<T>) {
  const [inUseItem, setInUseItem] = useState<T | null>(null)
  const [isInUseDialogOpen, setIsInUseDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const handleDelete = async (item: T) => {
    setIsDeleting(true)
    try {
      await onDelete(item)
      onSuccess?.()
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status
      if (status === 409) {
        setInUseItem(item)
        setIsInUseDialogOpen(true)
      } else if (status === 404) {
        onError?.("El registro ya no existe.")
        onSuccess?.()
      } else {
        onError?.(getErrorMessage(error))
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!inUseItem) return
    setIsDeactivating(true)
    try {
      await onDeactivate(inUseItem)
      setIsInUseDialogOpen(false)
      setInUseItem(null)
      onSuccess?.()
    } catch (error: any) {
      onError?.(getErrorMessage(error))
    } finally {
      setIsDeactivating(false)
    }
  }

  return {
    inUseItem,
    isInUseDialogOpen,
    setIsInUseDialogOpen,
    isDeleting,
    isDeactivating,
    resourceName,
    handleDelete,
    handleConfirmDeactivate,
  }
}