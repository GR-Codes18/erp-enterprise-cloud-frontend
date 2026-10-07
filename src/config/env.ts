import { z } from "zod"

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(),
  VITE_ENABLE_MOCKS: z.enum(["true", "false"]).default("false"),
})

/**
 * Valida las variables de entorno. Si falta o es inválida alguna, falla al
 * arrancar con un mensaje claro (solo los nombres, nunca los valores).
 */
export function parseEnv(raw: unknown) {
  const result = envSchema.safeParse(raw)

  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))]
    throw new Error(
      "Variables de entorno inválidas o faltantes: " +
        names.join(", ") +
        ". Revisa tu archivo .env (usa .env.example como guía).",
    )
  }

  return {
    apiBaseUrl: result.data.VITE_API_BASE_URL.replace(/\/+$/, ""),
    enableMocks: result.data.VITE_ENABLE_MOCKS === "true",
  }
}

export const env = parseEnv(import.meta.env)
