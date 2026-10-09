import { describe, expect, it } from "vitest"
import { checkUserRules } from "./mockRules"
import type { User } from "./schema"

const ADMIN = "role-admin"
const SALES = "role-sales"

const user = (id: string, email: string, role_id: string, status: User["status"] = "active"): User => ({
  id,
  name: `Usuario ${id}`,
  email,
  role_id,
  status,
})

const admin = user("1", "admin@enterprisecloud.example", ADMIN)
const seller = user("2", "ventas@enterprisecloud.example", SALES)

describe("checkUserRules", () => {
  it("permite crear un usuario con correo nuevo", () => {
    const next = user("3", "nuevo@enterprisecloud.example", SALES)
    expect(checkUserRules({ action: "create", next, items: [admin, seller] }, ADMIN)).toBeUndefined()
  })

  it("rechaza un correo repetido, sin importar mayúsculas", () => {
    const next = user("3", "VENTAS@EnterpriseCloud.example", SALES)
    const error = checkUserRules({ action: "create", next, items: [admin, seller] }, ADMIN)
    expect(error).toMatchObject({ status: 409, code: "DUPLICATE" })
    expect(error?.errors?.[0]?.field).toBe("email")
  })

  it("permite guardar un usuario con su mismo correo", () => {
    const next = { ...seller, name: "Otro nombre" }
    expect(
      checkUserRules({ action: "update", current: seller, next, items: [admin, seller] }, ADMIN),
    ).toBeUndefined()
  })

  it("no deja desactivar al último administrador activo", () => {
    const next = { ...admin, status: "inactive" as const }
    expect(
      checkUserRules({ action: "update", current: admin, next, items: [admin, seller] }, ADMIN),
    ).toMatchObject({ status: 409, code: "LAST_ADMIN" })
  })

  it("no deja quitarle el rol al último administrador activo", () => {
    const next = { ...admin, role_id: SALES }
    expect(
      checkUserRules({ action: "update", current: admin, next, items: [admin, seller] }, ADMIN),
    ).toMatchObject({ code: "LAST_ADMIN" })
  })

  it("un administrador inactivo no cuenta como respaldo", () => {
    const inactiveAdmin = user("3", "otro.admin@enterprisecloud.example", ADMIN, "inactive")
    const next = { ...admin, status: "inactive" as const }
    expect(
      checkUserRules(
        { action: "update", current: admin, next, items: [admin, seller, inactiveAdmin] },
        ADMIN,
      ),
    ).toMatchObject({ code: "LAST_ADMIN" })
  })

  it("permite desactivar a un administrador si queda otro activo", () => {
    const otherAdmin = user("3", "otro.admin@enterprisecloud.example", ADMIN)
    const next = { ...admin, status: "inactive" as const }
    expect(
      checkUserRules(
        { action: "update", current: admin, next, items: [admin, seller, otherAdmin] },
        ADMIN,
      ),
    ).toBeUndefined()
  })

  it("nadie se desactiva a sí mismo", () => {
    const next = { ...seller, status: "inactive" as const }
    expect(
      checkUserRules({ action: "update", current: seller, next, items: [admin, seller] }, ADMIN, seller.id),
    ).toMatchObject({ status: 409, code: "SELF_DEACTIVATION" })
    expect(checkUserRules({ action: "update", current: seller, next, items: [admin, seller] }, ADMIN, admin.id)).toBeUndefined()
  })
})
