import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { triggerDownload } from "./download"
import type { DocumentInput } from "./schema"
import { documentService } from "./service"

export const documentKeys = {
  all: ["documents"] as const,
  list: (params: PageParams) => [...documentKeys.all, "list", params] as const,
}

export function useDocuments(params: PageParams) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: ({ signal }) => documentService.list(params, signal),
    // Mientras carga otra página se sigue viendo la anterior (sin parpadeo)
    placeholderData: keepPreviousData,
  })
}

function useInvalidateDocuments() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: documentKeys.all })
}

/** Los 3 pasos de la subida en una sola operación: metadatos, archivo a S3 y confirmación. */
export function useUploadDocument() {
  const invalidate = useInvalidateDocuments()
  return useMutation({
    mutationFn: async ({ input, file }: { input: DocumentInput; file: File }) => {
      const ticket = await documentService.requestUpload(input)
      await documentService.uploadToStorage(ticket.upload_url, file)
      return documentService.confirmUpload(ticket.id)
    },
    onSuccess: invalidate,
  })
}

export function useVoidDocument() {
  const invalidate = useInvalidateDocuments()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      documentService.void(id, reason),
    onSuccess: invalidate,
  })
}

/** Pide el enlace temporal y arranca la descarga. El enlace no se guarda en ningún lado. */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const link = await documentService.getDownloadLink(id)
      triggerDownload(link.url, name)
    },
  })
}