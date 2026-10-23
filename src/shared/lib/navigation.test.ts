import { describe, expect, it } from "vitest"
import { filterModulesByPermission, findActiveModule, firstPath, getBreadcrumb } from "./navigation"
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
describe("filterModulesByPermission", () => {
  const modules: AppModule[] = [
    { id: "dashboard", label: "Dashboard", basePath: "dashboard", icon: dummyIcon, permission: "dashboard.summary:view" },
    {
      id: "inventory",
      label: "Inventario",
      basePath: "inventory",
      icon: dummyIcon,
      sections: [
        {
          items: [
            { path: "stock", label: "Stock", permission: "inventory.stock:view" },
            { path: "adjustments", label: "Ajustes", permission: "inventory.adjustments:view" },
          ],
        },
      ],
    },
    {
      id: "sales",
      label: "Ventas",
      basePath: "sales",
      icon: dummyIcon,
      sections: [{ items: [{ path: "quotes", label: "Cotizaciones", permission: "sales.quotes:view" }] }],
    },
  ]

  const only = (...permissions: string[]) => (permission: string) => permissions.includes(permission)

  it("deja solo las pantallas permitidas y quita los módulos vacíos", () => {
    const visible = filterModulesByPermission(modules, only("inventory.stock:view"))
    expect(visible.map((module) => module.id)).toEqual(["inventory"])
    expect(visible[0].sections?.[0].items.map((item) => item.path)).toEqual(["stock"])
  })

  it("un módulo de pantalla única depende de su propio permiso", () => {
    expect(filterModulesByPermission(modules, only("dashboard.summary:view")).map((m) => m.id)).toEqual([
      "dashboard",
    ])
  })

  it("con todos los permisos no quita nada", () => {
    expect(filterModulesByPermission(modules, () => true)).toEqual(modules)
  })

  it("una pantalla sin permiso declarado la ve cualquiera con sesión", () => {
    const open: AppModule[] = [{ id: "help", label: "Ayuda", basePath: "help", icon: dummyIcon }]
    expect(filterModulesByPermission(open, () => false)).toEqual(open)
  })
})

describe("firstPath", () => {
  it("lleva a la primera pantalla del primer módulo visible", () => {
    expect(firstPath(mockModules)).toBe("/dashboard")
    expect(firstPath(mockModules.slice(1))).toBe("/sales/quotes")
    expect(firstPath([])).toBeUndefined()
  })

  it("normaliza rutas absolutas del módulo de logística sin duplicar el prefijo", () => {
    const logisticsModules: AppModule[] = [
      {
        id: "logistics",
        label: "Logística",
        basePath: "/logistics",
        icon: dummyIcon,
        sections: [
          {
            label: "Operaciones",
            items: [{ path: "/logistics/vehicle-assignments", label: "Asignaciones", permission: "logistics.vehicles:view" }],
          },
        ],
      },
    ]

    expect(findActiveModule(logisticsModules, "/logistics/vehicle-assignments")).toEqual(logisticsModules[0])
    expect(getBreadcrumb(logisticsModules, "/logistics/vehicle-assignments")).toEqual({
      moduleLabel: "Logística",
      itemLabel: "Asignaciones",
    })
    expect(firstPath(logisticsModules)).toBe("/logistics/vehicle-assignments")
  })
})
