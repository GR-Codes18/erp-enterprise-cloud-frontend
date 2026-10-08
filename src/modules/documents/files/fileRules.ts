/**
 * Reglas de validación de archivos. Los valores están por confirmar con backend:
 * si cambian, se cambian SOLO aquí.
 */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

/** Extensiones válidas por tipo (para detectar un nombre que no corresponde al contenido declarado) */
export const MIME_EXTENSIONS: Record<AllowedMimeType, readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** Texto para mostrar al usuario */
export const ALLOWED_TYPES_LABEL = "PDF, PNG, JPG, XLSX o DOCX"

/** Valor del atributo accept del selector de archivos: ".pdf,.png,.jpg,.jpeg,.xlsx,.docx" */
export const ACCEPT_ATTRIBUTE = Object.values(MIME_EXTENSIONS)
  .flat()
  .map((extension) => `.${extension}`)
  .join(",")

/** 512 -> "512 B", 245760 -> "240 KB", 1572864 -> "1.5 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`
}

export const MAX_FILE_SIZE_LABEL = formatFileSize(MAX_FILE_SIZE_BYTES)

function isAllowedMimeType(type: string): type is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type)
}

/** Devuelve el mensaje de error para el usuario, o null si el archivo es válido. El backend vuelve a validar. */
export function validateFile(file: { name: string; size: number; type: string }): string | null {
  if (file.size === 0) return "El archivo está vacío"
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `El archivo supera el máximo de ${MAX_FILE_SIZE_LABEL}`
  }
  if (!isAllowedMimeType(file.type)) {
    return `Tipo de archivo no permitido. Usa ${ALLOWED_TYPES_LABEL}`
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!MIME_EXTENSIONS[file.type].includes(extension)) {
    return "La extensión del archivo no coincide con su tipo"
  }
  return null
}