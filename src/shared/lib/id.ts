/**
 * Genera un identificador único (UUID v4) de forma segura en cualquier contexto.
 *
 * `crypto.randomUUID()` solo está disponible en contextos seguros (HTTPS o localhost).
 * Si se abre la app por IP de red local (http://192.168.x.x) deja de existir y rompe
 * la creación de registros simulados. Este helper cae a un generador equivalente.
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Fallback RFC4122 v4 (no criptográfico, suficiente para mocks en desarrollo)
  const bytes = new Uint8Array(16)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`
}