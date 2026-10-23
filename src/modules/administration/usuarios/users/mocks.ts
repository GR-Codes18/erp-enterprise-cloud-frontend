import { sessionUserId } from "@/mocks/refs"
import { createCrudHandlers } from "@/mocks/utils/crud"
import { ADMIN_ROLE_ID, roleId } from "../roles/mockIds"
import { checkUserRules } from "./mockRules"
import type { User, UserStatus } from "./schema"

/** UUID fijos con el prefijo de usuarios (8010) */
const uuid = (n: number) => `00000000-0000-4000-8010-${String(n).padStart(12, "0")}`

const user = (
  n: number,
  name: string,
  email: string,
  role: number,
  status: UserStatus,
): User => ({
  id: uuid(n),
  name,
  email,
  role_id: roleId(role),
  status,
})

// 12 registros para poder ver la paginación con size=10
const seed: User[] = [
  user(1, "Gabriel Romero", "admin@enterprise.com", 1, "active"),
  user(2, "Lucía Fernández Soto", "lucia.fernandez@enterprisecloud.example", 1, "inactive"),
  user(3, "Ricardo Salas Mendoza", "ricardo.salas@enterprisecloud.example", 2, "active"),
  user(4, "Patricia Vargas León", "patricia.vargas@enterprisecloud.example", 2, "active"),
  user(5, "Carla Mendoza Ruiz", "carla.mendoza@enterprisecloud.example", 3, "active"),
  user(6, "Diego Paredes Cruz", "diego.paredes@enterprisecloud.example", 3, "active"),
  user(7, "Jorge Núñez Alva", "jorge.nunez@enterprisecloud.example", 3, "inactive"),
  user(8, "Pedro Campos Rivas", "pedro.campos@enterprisecloud.example", 4, "active"),
  user(9, "Silvia Ortega Luna", "silvia.ortega@enterprisecloud.example", 4, "active"),
  user(10, "Alan Reyes Cabrera", "almacen@enterprise.com", 5, "active"),
  user(11, "Rosa Delgado Peña", "rosa.delgado@enterprisecloud.example", 5, "active"),
  user(12, "Fiorella Gómez Ríos", "fiorella.gomez@enterprisecloud.example", 6, "active"),
]

/** Usuarios vigentes en memoria, para que el mock de Roles sepa si un rol está en uso */
let currentUsers: readonly User[] = seed
export const isRoleInUse = (id: string) => currentUsers.some((user) => user.role_id === id)

export const userHandlers = createCrudHandlers<User>({
  resource: "users",
  seed,
  searchFields: ["name", "email"],
  filterFields: ["status", "role_id"],
  validate: (write) => checkUserRules(write, ADMIN_ROLE_ID, write.request ? sessionUserId(write.request) : ""),
  onChange: (items) => {
    currentUsers = items
  },
})

/** Para que otros mocks del módulo (por ejemplo, auditoría) referencien usuarios reales */
export const userId = uuid