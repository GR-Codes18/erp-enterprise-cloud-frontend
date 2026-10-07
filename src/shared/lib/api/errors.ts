import type { FieldError } from "@/shared/lib/api/types"

export class ApiError extends Error {
  /** Código HTTP. 0 significa que no hubo respuesta (error de red). */
  readonly status: number
  /** Código de negocio del backend, ej. "VALIDATION_ERROR". */
  readonly code: string
  readonly fieldErrors: FieldError[]

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: FieldError[] = [],
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Mensaje seguro para mostrar al usuario. Nunca expone detalles técnicos.
 * Solo en errores de validación o de regla de negocio (400, 409, 422) se usa
 * el mensaje del backend, que debe estar pensado para el usuario final.
 */
export function getErrorMessage(error: unknown): string {
  if (!isApiError(error)) {
    return "Ocurrió un error inesperado. Inténtalo de nuevo."
  }

  switch (error.status) {
    case 0:
      return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."
    case 400:
    case 409:
    case 422:
      return error.message || "Revisa los datos ingresados."
    case 401:
      return "Tu sesión expiró. Inicia sesión nuevamente."
    case 403:
      return "No tienes permiso para realizar esta acción."
    case 404:
      return "No se encontró lo que buscas."
    default:
      return error.status >= 500
        ? "El servidor tuvo un problema. Inténtalo más tarde."
        : "Ocurrió un error inesperado. Inténtalo de nuevo."
  }
}
