import { describe, expect, it } from "vitest"
import { ApiError, UNKNOWN_ERROR, getErrorMessage } from "./errors"

describe("getErrorMessage", () => {
  it("muestra el mensaje del backend en errores de negocio", () => {
    const error = new ApiError(409, "IN_USE", "Este rol tiene usuarios asignados.")
    expect(getErrorMessage(error)).toBe("Este rol tiene usuarios asignados.")
  })

  it('nunca muestra el texto técnico de una respuesta sin formato ("HTTP 409")', () => {
    const message = getErrorMessage(new ApiError(409, UNKNOWN_ERROR, "HTTP 409"))
    expect(message).not.toContain("HTTP")
    expect(message).toBe("No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.")
  })

  it("traduce los estados sin mensaje propio", () => {
    expect(getErrorMessage(new ApiError(0, "NETWORK_ERROR", "Network request failed"))).toContain("conectar")
    expect(getErrorMessage(new ApiError(403, "FORBIDDEN", "x"))).toBe("No tienes permiso para realizar esta acción.")
    expect(getErrorMessage(new ApiError(500, "SERVER", "stack trace"))).not.toContain("stack")
  })

  it("un error que no es de la API da un mensaje genérico", () => {
    expect(getErrorMessage(new Error("TypeError: x is undefined"))).toBe(
      "Ocurrió un error inesperado. Inténtalo de nuevo.",
    )
  })
})
