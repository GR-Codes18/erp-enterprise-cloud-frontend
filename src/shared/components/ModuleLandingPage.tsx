import { ArrowRight, FolderOpen, Package, Warehouse, Users, BriefcaseBusiness, Building2, FileText, Boxes, ChevronRight, Download } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router"
import { useAuth } from "@/modules/auth"
import { hasPermission } from "@/modules/auth/permissions"
import type { AppModule, ModuleItem } from "@/shared/types/module"

const sectionIcons: Record<string, typeof FolderOpen> = {
  organización: Building2,
  "comercial y clientes": Users,
  "inventario y productos": Package,
  finanzas: BriefcaseBusiness,
  default: FolderOpen,
}

const MASTER_SUBMODULE_DATA: Record<string, { description: string; fields: string[] }> = {
  Empresas: {
    description: "Razones sociales y parámetros generales de la empresa.",
    fields: ["RUC", "razón_social", "dirección_fiscal", "logo", "moneda_base", "estado"],
  },
  Sucursales: {
    description: "Sedes de la empresa con ubicación y coordinación operativa.",
    fields: ["código", "nombre", "dirección", "empresa_id", "teléfono", "estado"],
  },
  Almacenes: {
    description: "Depósitos y ubicaciones para controlar stock y recepciones.",
    fields: ["código", "nombre", "dirección", "sucursal_id", "responsable_id", "tipo", "estado"],
  },
  Productos: {
    description: "Catálogo base de productos y referencias del negocio.",
    fields: ["SKU", "nombre", "descripción", "categoría_id", "marca_id", "UM_base", "peso", "código_barras", "estado"],
  },
  Categorías: {
    description: "Jerarquía de clasificación para catalogar productos.",
    fields: ["código", "nombre", "padre_id", "nivel", "estado"],
  },
  Marcas: {
    description: "Fabricantes o marcas comerciales asociadas a los productos.",
    fields: ["código", "nombre", "país_origen", "contacto", "estado"],
  },
  "Unidades de medida": {
    description: "Unidades y abreviaturas usadas para medir y operar inventario.",
    fields: ["código", "nombre", "abreviatura", "precisión", "estado"],
  },
  "Conversiones de unidades": {
    description: "Equivalencias entre unidades para conversiones de inventario.",
    fields: ["producto_id", "UM_origen", "UM_destino", "factor", "vigencia"],
  },
  Clientes: {
    description: "Cartera de clientes con condiciones comerciales y contacto.",
    fields: ["tipo_documento", "número_documento", "razón_social", "dirección", "lista_precio_id", "límite_crédito", "condición_pago", "estado"],
  },
  Proveedores: {
    description: "Cartera de proveedores y condiciones de compra asociadas.",
    fields: ["RUC", "razón_social", "dirección", "contacto", "condición_compra", "plazo_entrega", "moneda_preferida", "estado"],
  },
  Transportistas: {
    description: "Empresas o personas encargadas del transporte y coordinación logística.",
    fields: ["documento", "razón_social", "licencia", "vehículos", "conductores", "contacto", "estado"],
  },
  Vendedores: {
    description: "Fuerza de ventas con comisiones, metas y asignación de zona.",
    fields: ["código", "nombre", "comisión_pct", "meta_mensual", "zona_id", "usuario_id", "estado"],
  },
  Zonas: {
    description: "Zonas geográficas comerciales para asignación de rutas y vendedores.",
    fields: ["código", "nombre", "ruta_id", "vendedor_id", "estado"],
  },
  "Monedas y tipos de cambio": {
    description: "Divisas y tipos de cambio aplicables a operaciones comerciales.",
    fields: ["código_ISO", "nombre", "símbolo", "fecha", "tipo_compra", "tipo_venta"],
  },
  Impuestos: {
    description: "Tributos configurables para compras, ventas y operación fiscal.",
    fields: ["código", "nombre", "porcentaje", "tipo", "vigencia", "estado"],
  },
  "Formas de pago": {
    description: "Condiciones y medios de pago del negocio.",
    fields: ["código", "nombre", "días_crédito", "tipo", "estado"],
  },
  "Listas de precios": {
    description: "Precios por cliente o volumen para ventas y cotizaciones.",
    fields: ["código", "nombre", "moneda_id", "vigencia_inicio", "vigencia_fin", "estado"],
  },
}

function buildItemInfo(item: ModuleItem, moduleLabel: string): { description: string; fields: string[] } {
  const text = item.label.toLowerCase()
  const base = `${moduleLabel.toLowerCase()} · ${text}`

  if (MASTER_SUBMODULE_DATA[item.label]) {
    return MASTER_SUBMODULE_DATA[item.label]
  }

  const fallbackFields = [
    "código",
    "nombre",
    "estado",
  ]

  return {
    description: `Acceso directo a ${base}.`,
    fields: fallbackFields,
  }
}

function buildSectionLabel(label?: string): string {
  return (label ?? "Acceso rápido").toUpperCase()
}

function getSectionIcon(label?: string) {
  const normalized = (label ?? "").toLowerCase()
  return sectionIcons[normalized] ?? sectionIcons.default
}

function getItemIcon(item: ModuleItem): typeof FolderOpen {
  const text = item.label.toLowerCase()
  if (text.includes("cliente")) return Users
  if (text.includes("proveedor")) return BriefcaseBusiness
  if (text.includes("producto")) return Package
  if (text.includes("categor")) return FolderOpen
  if (text.includes("almac")) return Warehouse
  if (text.includes("venta")) return FileText
  if (text.includes("compra")) return FileText
  if (text.includes("invent")) return Boxes
  if (text.includes("finanza")) return BriefcaseBusiness
  return FolderOpen
}

export function ModuleLandingPage({ module }: { module: AppModule }) {
  const { user } = useAuth()
  const [selectedSection, setSelectedSection] = useState<string>("todos")

  const visibleSections = useMemo(
    () =>
      (module.sections ?? [])
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => item.permission === undefined || hasPermission(user, item.permission),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [module, user],
  )

  const sectionTabs = [
    { value: "todos", label: "Todos" },
    ...visibleSections.map((section) => ({
      value: section.label ?? "acceso-rapido",
      label: section.label ?? "Acceso rápido",
    })),
  ]

  const filteredSections =
    selectedSection === "todos"
      ? visibleSections
      : visibleSections.filter((section) => (section.label ?? "acceso-rapido") === selectedSection)

  if (visibleSections.length === 0) {
    return (
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FolderOpen className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Inicio</p>
            <h1 className="text-2xl font-semibold text-slate-900">{module.label}</h1>
          </div>
        </header>
        <p className="text-sm text-slate-500">No hay accesos disponibles en este módulo.</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm">
            <module.icon className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Inicio</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{module.label}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {module.sections?.flatMap((section) => section.items).length ?? 0} submódulos · Acceso directo a los datos del ERP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <Download className="size-4" />
            Exportar
          </button>
        </div>
      </header>

      {sectionTabs.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {sectionTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedSection(tab.value)}
              className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSection === tab.value
                  ? "border-cyan-300 bg-cyan-50 text-cyan-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-8">
        {filteredSections.map((section) => {
          const SectionIcon = getSectionIcon(section.label)

          return (
            <div key={section.label ?? "acceso-rapido"} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <SectionIcon className="size-4 text-cyan-700" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {buildSectionLabel(section.label)}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => {
                  const ItemIcon = getItemIcon(item)
                  const info = buildItemInfo(item, module.label)

                  return (
                    <Link
                      key={item.path}
                      to={`/${module.basePath}/${item.path}`}
                      className="group flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex size-11 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm">
                            <ItemIcon className="size-5" />
                          </div>
                          <ChevronRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-700" />
                        </div>

                        <div>
                          <h3 className="text-[1.05rem] font-semibold text-slate-900">{item.label}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{info.description}</p>
                          <div className="mt-3 border-t border-slate-200 pt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Campos clave
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-600">
                              {info.fields.slice(0, 4).join(" · ")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-200 pt-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Información</p>
                        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-slate-600">
                          <span>{module.label}</span>
                          <ArrowRight className="size-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800">{item.label}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
