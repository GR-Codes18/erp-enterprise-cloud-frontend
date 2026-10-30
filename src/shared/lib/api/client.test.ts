import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "./client"
import { getAccessToken, onUnauthorized, setAccessToken, setTokenRefresher } from "./token"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

describe("cliente HTTP: sesión", () => {
  const fetchMock = vi.fn<typeof fetch>()
  const loggedOut = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    loggedOut.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    onUnauthorized(loggedOut)
    setAccessToken("vencido")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setTokenRefresher(null)
    setAccessToken(null)
  })

  it("envía el token en memoria y la cookie de refresh", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }))
    await api.get("/customers")
    const [, init] = fetchMock.mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer vencido")
    expect(init?.credentials).toBe("include")
  })

  it("ante un 401 renueva el token una vez y repite la petición", async () => {
    setTokenRefresher(async () => {
      setAccessToken("nuevo")
      return true
    })
    fetchMock.mockResolvedValueOnce(json(401, { code: "TOKEN_EXPIRED", message: "x" }))
    fetchMock.mockResolvedValueOnce(json(200, { id: "1" }))

    await expect(api.get("/customers/1")).resolves.toEqual({ id: "1" })
    const [, retry] = fetchMock.mock.calls[1]
    expect((retry?.headers as Record<string, string>).Authorization).toBe("Bearer nuevo")
    expect(loggedOut).not.toHaveBeenCalled()
  })

  it("si no se puede renovar, cierra la sesión", async () => {
    setTokenRefresher(async () => false)
    fetchMock.mockResolvedValueOnce(json(401, { code: "TOKEN_EXPIRED", message: "x" }))

    await expect(api.get("/customers")).rejects.toMatchObject({ status: 401 })
    expect(loggedOut).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
  })

  it("no reintenta en bucle: un segundo 401 tras renovar termina la sesión", async () => {
    setTokenRefresher(async () => true)
    fetchMock.mockImplementation(async () => json(401, { code: "TOKEN_EXPIRED", message: "x" }))

    await expect(api.get("/customers")).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(loggedOut).toHaveBeenCalledTimes(1)
  })

  it("varias peticiones con 401 a la vez comparten un solo refresh", async () => {
    const refresher = vi.fn(async () => true)
    setTokenRefresher(refresher)
    fetchMock
      .mockResolvedValueOnce(json(401, { code: "TOKEN_EXPIRED", message: "x" }))
      .mockResolvedValueOnce(json(401, { code: "TOKEN_EXPIRED", message: "x" }))
      .mockImplementation(async () => json(200, { ok: true }))

    await Promise.all([api.get("/a"), api.get("/b")])
    expect(refresher).toHaveBeenCalledTimes(1)
  })

  it("un 401 en las rutas de sesión no dispara el refresh", async () => {
    const refresher = vi.fn(async () => true)
    setTokenRefresher(refresher)
    fetchMock.mockResolvedValueOnce(json(401, { code: "INVALID_CREDENTIALS", message: "Credenciales inválidas." }))

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ status: 401 })
    expect(refresher).not.toHaveBeenCalled()
  })
})
