import { describe, expect, it } from "vitest"
import {
  PERMISSION_PATTERN,
  findScreensWithoutView,
  groupByModule,
  permissionKey,
  togglePermission,
  type PermissionScreen,
} from "./schema"

const screen = (code: string, module: string): PermissionScreen => ({
  id: code,
  code,
  module,
  module_label: module,
  label: code,
  actions: ["view"],
})

describe("permissionKey y formato", () => {
  it("arma el permiso como pantalla:acción", () => {
    expect(permissionKey("inventory.stock", "view")).toBe("inventory.stock:view")
  })

  it("acepta permisos válidos y rechaza los mal formados", () => {
    expect(PERMISSION_PATTERN.test("inventory.stock:view")).toBe(true)
    expect(PERMISSION_PATTERN.test("sales.quotes:approve")).toBe(true)
    expect(PERMISSION_PATTERN.test("inventory.stock:delete")).toBe(false)
    expect(PERMISSION_PATTERN.test("stock:view")).toBe(false)
    expect(PERMISSION_PATTERN.test("")).toBe(false)
  })
})

describe("togglePermission", () => {
  it("marcar una acción también marca Ver", () => {
    expect(togglePermission([], "sales.quotes", "edit", true)).toEqual([
      "sales.quotes:edit",
      "sales.quotes:view",
    ])
  })

  it("marcar Ver no agrega otras acciones", () => {
    expect(togglePermission([], "sales.quotes", "view", true)).toEqual(["sales.quotes:view"])
  })

  it("desmarcar una acción distinta de Ver conserva Ver", () => {
    const current = ["sales.quotes:view", "sales.quotes:edit"]
    expect(togglePermission(current, "sales.quotes", "edit", false)).toEqual(["sales.quotes:view"])
  })

  it("desmarcar Ver quita todas las acciones de esa pantalla", () => {
    const current = ["sales.quotes:view", "sales.quotes:edit", "sales.quotes:void"]
    expect(togglePermission(current, "sales.quotes", "view", false)).toEqual([])
  })

  it("no toca los permisos de otras pantallas", () => {
    const current = ["sales.quotes:view", "inventory.stock:view"]
    expect(togglePermission(current, "sales.quotes", "view", false)).toEqual(["inventory.stock:view"])
  })

  it("no duplica permisos y devuelve el resultado ordenado", () => {
    const result = togglePermission(["b.x:view"], "a.y", "create", true)
    expect(result).toEqual(["a.y:create", "a.y:view", "b.x:view"])
    expect(togglePermission(result, "a.y", "create", true)).toEqual(result)
  })
})

describe("findScreensWithoutView", () => {
  it("detecta pantallas con acciones pero sin Ver", () => {
    expect(findScreensWithoutView(["sales.quotes:edit", "inventory.stock:view"])).toEqual([
      "sales.quotes",
    ])
  })

  it("devuelve vacío cuando todo está completo o no hay permisos", () => {
    expect(findScreensWithoutView([])).toEqual([])
    expect(findScreensWithoutView(["sales.quotes:view", "sales.quotes:edit"])).toEqual([])
  })
})

describe("groupByModule", () => {
  it("agrupa por módulo respetando el orden del catálogo", () => {
    const groups = groupByModule([
      screen("sales.quotes", "sales"),
      screen("inventory.stock", "inventory"),
      screen("sales.orders", "sales"),
    ])
    expect(groups.map((g) => g.module)).toEqual(["sales", "inventory"])
    expect(groups[0]?.screens.map((s) => s.code)).toEqual(["sales.quotes", "sales.orders"])
  })
})