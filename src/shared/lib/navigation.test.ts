import { describe, expect, it } from "vitest"
import { findActiveModule, getBreadcrumb } from "./navigation"
import type { AppModule } from "@/shared/types/module"

const dummyIcon = () => null

const mockModules: AppModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    basePath: "dashboard",
    icon: dummyIcon,
  },
  {
    id: "sales",
    label: "Ventas",
    basePath: "sales",
    icon: dummyIcon,
    sections: [
      {
        label: "Operaciones",
        items: [
          {
            path: "quotes",
            label: "Cotizaciones",
            subRoutes: [
              { path: "new", label: "Nueva cotización" },
              { path: ":id", label: "Detalle de cotización" },
            ],
          },
          {
            path: "orders",
            label: "Pedidos",
          },
        ],
      },
    ],
  },
]

describe("findActiveModule", () => {
  it("encuentra el módulo correcto según la URL", () => {
    expect(findActiveModule(mockModules, "/sales/quotes")).toEqual(mockModules[1])
    expect(findActiveModule(mockModules, "/sales/quotes/new")).toEqual(mockModules[1])
    expect(findActiveModule(mockModules, "/dashboard")).toEqual(mockModules[0])
  })

  it("devuelve undefined para rutas no registradas", () => {
    expect(findActiveModule(mockModules, "/unknown")).toBeUndefined()
  })
})

describe("getBreadcrumb", () => {
  it("genera breadcrumb para módulos de pantalla única", () => {
    expect(getBreadcrumb(mockModules, "/dashboard")).toEqual({
      moduleLabel: "Dashboard",
    })
  })

  it("genera breadcrumb para ítems principales de un módulo con secciones", () => {
    expect(getBreadcrumb(mockModules, "/sales/quotes")).toEqual({
      moduleLabel: "Ventas",
      itemLabel: "Cotizaciones",
    })
  })

  it("genera breadcrumb para subrutas estáticas (ej. /new)", () => {
    expect(getBreadcrumb(mockModules, "/sales/quotes/new")).toEqual({
      moduleLabel: "Ventas",
      itemLabel: "Cotizaciones",
      subItemLabel: "Nueva cotización",
    })
  })

  it("genera breadcrumb para subrutas dinámicas (ej. /:id)", () => {
    expect(getBreadcrumb(mockModules, "/sales/quotes/00000000-0000-4000-8000-000000000001")).toEqual({
      moduleLabel: "Ventas",
      itemLabel: "Cotizaciones",
      subItemLabel: "Detalle de cotización",
    })
  })

  it("hace fallback al ítem principal si la subruta no coincide", () => {
    expect(getBreadcrumb(mockModules, "/sales/quotes/unknown/path")).toEqual({
      moduleLabel: "Ventas",
      itemLabel: "Cotizaciones",
    })
  })

  it("devuelve undefined para rutas desconocidas", () => {
    expect(getBreadcrumb(mockModules, "/404")).toBeUndefined()
  })
})