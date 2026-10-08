import { api } from "@/shared/lib/api/client"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import { toListQuery } from "@/shared/lib/api/query"
import type { DocumentInput, DocumentRecord, DownloadLink, UploadTicket } from "./schema"

const BASE = "/documents"

/** Falla el paso 2 (subir el archivo a S3). Se distingue para mostrar un mensaje útil. */
export class StorageUploadError extends Error {
  constructor() {
    super("No se pudo subir el archivo")
    this.name = "StorageUploadError"
  }
}

/**
 * Flujo de subida propuesto (aún no está en el contrato):
 *   1. POST /documents                  -> metadatos; el backend responde { id, upload_url }
 *   2. PUT <upload_url> (directo a S3)  -> el archivo; no pasa por nuestra API
 *   3. POST /documents/{id}/confirm     -> el backend verifica y deja el documento activo
 */
export const documentService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<DocumentRecord>>(BASE, { query: toListQuery(params), signal }),

  requestUpload: (input: DocumentInput) => api.post<UploadTicket>(BASE, input),

  // La URL de S3 es externa y ya viene firmada: no se usa el cliente de la API ni se envía ninguna credencial
  uploadToStorage: async (uploadUrl: string, file: File): Promise<void> => {
    let response: Response
    try {
      response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
    } catch {
      throw new StorageUploadError()
    }
    if (!response.ok) throw new StorageUploadError()
  },

  confirmUpload: (id: string) =>
    api.post<DocumentRecord>(`${BASE}/${encodeURIComponent(id)}/confirm`, {}),

  /** Eliminación lógica: el motivo es obligatorio y el documento deja de listarse */
  void: (id: string, reason: string) =>
    api.post<void>(`${BASE}/${encodeURIComponent(id)}/void`, { reason }),

  /** Enlace temporal firmado: nunca URLs públicas ni permanentes */
  getDownloadLink: (id: string) =>
    api.get<DownloadLink>(`${BASE}/${encodeURIComponent(id)}/download-url`),
}