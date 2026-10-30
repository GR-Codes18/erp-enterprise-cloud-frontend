import { describe, expect, it, vi } from "vitest"
import { appModules } from "./modules"
import { permissionSeed } from "@/modules/administration/permissions/mocks"

// Los index de los módulos cargan el cliente API, que exige .env: aquí no hace falta
vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

function findDuplicates(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index)
}

describe("appModules", () => {
  it("mantiene el id técnico y muestra el módulo como Maestro", () => {
    const maintenance = appModules.find((module) => module.id === "maintenance")

    expect(maintenance).toBeDefined()
    expect(maintenance?.id).toBe("maintenance")
    expect(maintenance?.basePath).toBe("maintenance")
    expect(maintenance?.label).toBe("Maestro")
  })

  it("expone todos los submódulos principales del maestro", () => {
    const maintenance = appModules.find((module) => module.id === "maintenance")
    const labels = maintenance?.sections?.flatMap((section) => section.items.map((item) => item.label)) ?? []

    expect(labels).toEqual(expect.arrayContaining([
      "Empresas",
      "Sucursales",
      "Almacenes",
      "Productos",
      "Categorías",
      "Marcas",
      "Unidades de medida",
      "Conversiones de unidades",
      "Clientes",
      "Proveedores",
      "Transportistas",
      "Vendedores",
      "Zonas",
      "Monedas y tipos de cambio",
      "Impuestos",
      "Formas de pago",
      "Listas de precios",
    ]))
  })

  it("cada submódulo del maestro tiene una pantalla funcional asociada", () => {
    const maintenance = appModules.find((module) => module.id === "maintenance")
    const items = maintenance?.sections?.flatMap((section) => section.items) ?? []

    expect(items.length).toBeGreaterThan(0)
    expect(items.every((item) => Boolean(item.page))).toBe(true)
  })

  it("Tesorería publica los doce submódulos funcionales con campos propios", () => {
    const finance = appModules.find((module) => module.id === "finance")
    const items = finance?.sections?.flatMap((section) => section.items.filter((item) => !item.hidden)) ?? []

    expect(items.map((item) => item.label)).toEqual([
      "Cobros",
      "Pagos a proveedores",
      "Cuentas por cobrar",
      "Cuentas por pagar",
      "Caja chica",
      "Caja general",
      "Cuentas bancarias",
      "Movimientos bancarios",
      "Conciliación bancaria",
      "Flujo de caja",
      "Letras, pagarés y cheques",
      "Tributos y reportes financieros",
    ])
    expect(items.every((item) => item.description && item.keyFields && item.keyFields.length > 0)).toBe(true)
  })

  it("los accesos visibles y detalles de Tesorería usan permisos del catálogo", () => {
    const finance = appModules.find((module) => module.id === "finance")
    const catalog = new Set(
      permissionSeed.flatMap((screen) => screen.actions.map((action) => `${screen.code}:${action}`)),
    )
    const items = finance?.sections?.flatMap((section) => section.items) ?? []
    const declared = items.flatMap((item) => [
      ...(item.permission ? [item.permission] : []),
      ...(item.subRoutes ?? []).flatMap((route) => route.permission ? [route.permission] : []),
    ])

    expect(declared.every((permission) => catalog.has(permission))).toBe(true)
  })

  it("no repite el basePath entre módulos", () => {
    expect(findDuplicates(appModules.map((module) => module.basePath))).toEqual([])
  })

  it.each(appModules.filter((module) => module.sections))(
    "$id no registra la misma ruta dos veces",
    (module) => {
      const paths = module.sections!.flatMap((section) => section.items.map((item) => item.path))
      expect(findDuplicates(paths)).toEqual([])
    },
  )

  it("toda pantalla exige un permiso que existe en el catálogo", () => {
    const catalog = new Set(
      permissionSeed.flatMap((screen) => screen.actions.map((action) => `${screen.code}:${action}`)),
    )
    const declared = appModules.flatMap((module) => [
      ...(module.page ? [{ where: module.id, permission: module.permission }] : []),
      ...(module.sections ?? []).flatMap((section) =>
        section.items.flatMap((item) => [
          { where: `${module.id}/${item.path}`, permission: item.permission },
          ...(item.subRoutes ?? [])
            .filter((sub) => sub.permission)
            .map((sub) => ({ where: `${module.id}/${item.path}/${sub.path}`, permission: sub.permission })),
        ]),
      ),
    ])
    const problems = declared.filter(({ permission }) => !permission || !catalog.has(permission))
    expect(problems).toEqual([])
  })
})
