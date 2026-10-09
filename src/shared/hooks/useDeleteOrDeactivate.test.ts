import { describe, it, expect } from "vitest"
import { ApiError, getErrorMessage } from "@/shared/lib/api/errors"

describe("useDeleteOrDeactivate error handling logic", () => {
  it("formatea correctamente el mensaje de error 409 usando ApiError", () => {
    const error = new ApiError(
      409,
      "RESOURCE_IN_USE",
      "Este registro tiene operaciones asociadas."
    )
    const message = getErrorMessage(error)
    expect(message).toBe("Este registro tiene operaciones asociadas.")
  })

  it("devuelve mensaje genérico para errores 500", () => {
    const error = new ApiError(500, "INTERNAL_SERVER_ERROR", "Error interno")
    const message = getErrorMessage(error)
    expect(message).toBe("El servidor tuvo un problema. Inténtalo más tarde.")
  })

  it("reconoce status de ApiError para captura de conflicto 409", () => {
    const error = new ApiError(409, "CONFLICT", "En uso")
    expect(error.status).toBe(409)
  })
})