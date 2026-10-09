// Lo que este módulo publica para otros (regla 0.5): solo tipos y hooks de consulta.
// AuthProvider, LoginPage y ProtectedRoute los monta la capa app (src/app), no otros módulos.
export { useAuth, useHasPermission } from "./useAuth"
export type { User } from "./types"
