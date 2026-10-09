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
