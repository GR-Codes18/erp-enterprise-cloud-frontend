import { useMemo, useState } from "react"
import { useLocation } from "react-router"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { PageHeader } from "@/shared/components/PageHeader"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"

type MasterStatus = "active" | "inactive"

type MasterRow = {
  id: string
  code: string
  name: string
  detail: string
  status: MasterStatus
}

interface MasterConfig {
  title: string
  description: string
  singular: string
  rows: MasterRow[]
}

const MASTER_CONFIG: Record<string, MasterConfig> = {
  companies: {
    title: "Empresas",
    description: "Administra las empresas del sistema y sus datos base.",
    singular: "empresa",
    rows: [
      { id: "c1", code: "EMP-001", name: "ERP Holding SAC", detail: "Lima · RUC 20602485071", status: "active" },
      { id: "c2", code: "EMP-002", name: "Logística Norte SRL", detail: "Arequipa · RUC 20546821301", status: "active" },
      { id: "c3", code: "EMP-003", name: "Plaza del Sur EIRL", detail: "Cusco · RUC 20457862130", status: "inactive" },
    ],
  },
  branches: {
    title: "Sucursales",
    description: "Controla sedes, ubicaciones y coordinación operativa por filial.",
    singular: "sucursal",
    rows: [
      { id: "b1", code: "SUC-001", name: "Sucursal Central", detail: "Lima · Av. Principal 245", status: "active" },
      { id: "b2", code: "SUC-002", name: "Sucursal Norte", detail: "Trujillo · Calle 11, zona industrial", status: "active" },
      { id: "b3", code: "SUC-003", name: "Sucursal Sur", detail: "Cusco · Av. Real 89", status: "inactive" },
    ],
  },
  brands: {
    title: "Marcas",
    description: "Mantén los fabricantes o marcas asociadas al catálogo.",
    singular: "marca",
    rows: [
      { id: "m1", code: "MAR-001", name: "Samsung", detail: "Electrónica · soporte técnico", status: "active" },
      { id: "m2", code: "MAR-002", name: "Nike", detail: "Calzado · accesorios corporativos", status: "active" },
      { id: "m3", code: "MAR-003", name: "Bosch", detail: "Herramientas · importación", status: "inactive" },
    ],
  },
  units: {
    title: "Unidades de medida",
    description: "Define las unidades base y abreviaturas del inventario.",
    singular: "unidad",
    rows: [
      { id: "u1", code: "UND-001", name: "Unidad", detail: "UND · pieza individual", status: "active" },
      { id: "u2", code: "UND-002", name: "Kilogramo", detail: "KG · peso bruto", status: "active" },
      { id: "u3", code: "UND-003", name: "Litro", detail: "LTR · volumen", status: "active" },
    ],
  },
  "unit-conversions": {
    title: "Conversiones de unidades",
    description: "Registra equivalencias entre unidades para el sistema de inventario.",
    singular: "conversión",
    rows: [
      { id: "uc1", code: "CON-001", name: "Caja a Und", detail: "1 caja = 12 unidades", status: "active" },
      { id: "uc2", code: "CON-002", name: "Kilogramo a Libra", detail: "1 kg = 2.20462 lb", status: "active" },
      { id: "uc3", code: "CON-003", name: "Litro a Mililitro", detail: "1 litro = 1000 ml", status: "inactive" },
    ],
  },
  transporters: {
    title: "Transportistas",
    description: "Gestiona empresas y personas de transporte y reparto.",
    singular: "transportista",
    rows: [
      { id: "t1", code: "TRA-001", name: "Mundo Express", detail: "RUC 20123344081 · rutas nacionales", status: "active" },
      { id: "t2", code: "TRA-002", name: "Cargomax S.A.C.", detail: "RUC 20190023122 · logística de frío", status: "active" },
      { id: "t3", code: "TRA-003", name: "Velocidad Plus", detail: "RUC 20443311091 · reparto local", status: "inactive" },
    ],
  },
  sellers: {
    title: "Vendedores",
    description: "Mantén a la fuerza de ventas y sus metas por zona.",
    singular: "vendedor",
    rows: [
      { id: "s1", code: "VEN-001", name: "Ana Torres", detail: "Zona sur · comisión 6%", status: "active" },
      { id: "s2", code: "VEN-002", name: "Luis Rojas", detail: "Zona centro · comisión 5%", status: "active" },
      { id: "s3", code: "VEN-003", name: "Marta Sifuentes", detail: "Zona norte · comisión 7%", status: "inactive" },
    ],
  },
  zones: {
    title: "Zonas",
    description: "Agrupa distritos o regiones para cobertura comercial.",
    singular: "zona",
    rows: [
      { id: "z1", code: "ZON-001", name: "Lima Centro", detail: "Cobertura urbana central", status: "active" },
      { id: "z2", code: "ZON-002", name: "Costa Norte", detail: "Trujillo y Chiclayo", status: "active" },
      { id: "z3", code: "ZON-003", name: "Andes Sur", detail: "Cusco y Arequipa", status: "inactive" },
    ],
  },
  currencies: {
    title: "Monedas y tipos de cambio",
    description: "Configura divisas y sus tipos de cambio vigentes.",
    singular: "moneda",
    rows: [
      { id: "cr1", code: "CUR-001", name: "Sol", detail: "PEN · tipo base 1.00", status: "active" },
      { id: "cr2", code: "CUR-002", name: "Dólar", detail: "USD · tipo 3.72", status: "active" },
      { id: "cr3", code: "CUR-003", name: "Euro", detail: "EUR · tipo 4.10", status: "inactive" },
    ],
  },
  taxes: {
    title: "Impuestos",
    description: "Registra tributos vigentes y sus porcentajes.",
    singular: "impuesto",
    rows: [
      { id: "tx1", code: "TAX-001", name: "IGV", detail: "18% · ventas y compras", status: "active" },
      { id: "tx2", code: "TAX-002", name: "ISC", detail: "4% · algunos bienes", status: "active" },
      { id: "tx3", code: "TAX-003", name: "Percepción", detail: "2% · servicios selectos", status: "inactive" },
    ],
  },
  "payment-methods": {
    title: "Formas de pago",
    description: "Define medios de pago y condiciones del negocio.",
    singular: "forma de pago",
    rows: [
      { id: "pm1", code: "PAY-001", name: "Efectivo", detail: "Pago al contado", status: "active" },
      { id: "pm2", code: "PAY-002", name: "Tarjeta", detail: "Visa y Mastercard", status: "active" },
      { id: "pm3", code: "PAY-003", name: "Crédito", detail: "14 días · con documento", status: "inactive" },
    ],
  },
  "price-lists": {
    title: "Listas de precios",
    description: "Mantén escalas de precios por cartera y vigencia.",
    singular: "lista de precios",
    rows: [
      { id: "pl1", code: "PRI-001", name: "Lista General", detail: "Vigente 2026 · PEN", status: "active" },
      { id: "pl2", code: "PRI-002", name: "Distribuidores", detail: "Descuento por volumen", status: "active" },
      { id: "pl3", code: "PRI-003", name: "Mayoristas", detail: "Precios corporativos", status: "inactive" },
    ],
  },
}

const EMPTY_FORM = { code: "", name: "", detail: "", status: "active" as MasterStatus }

export default function MasterCatalogPage() {
  const location = useLocation()
  const routeKey = location.pathname.split("/").filter(Boolean).at(-1) ?? "companies"
  const config = MASTER_CONFIG[routeKey] ?? MASTER_CONFIG.companies

  const [rows, setRows] = useState<MasterRow[]>(config.rows)
  const [query, setQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return rows

    return rows.filter((row) => {
      return [row.code, row.name, row.detail].some((value) => value.toLowerCase().includes(term))
    })
  }, [query, rows])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  const openEdit = (row: MasterRow) => {
    setEditingId(row.id)
    setForm({ code: row.code, name: row.name, detail: row.detail, status: row.status })
    setIsDialogOpen(true)
  }

  const saveForm = () => {
    const nextCode = form.code.trim()
    const nextName = form.name.trim()
    const nextDetail = form.detail.trim()

    if (!nextCode || !nextName) return

    if (editingId) {
      setRows((current) =>
        current.map((row) =>
          row.id === editingId ? { ...row, code: nextCode, name: nextName, detail: nextDetail, status: form.status } : row,
        ),
      )
    } else {
      setRows((current) => [
        {
          id: `${Date.now()}`,
          code: nextCode,
          name: nextName,
          detail: nextDetail || "Sin información adicional",
          status: form.status,
        },
        ...current,
      ])
    }

    setIsDialogOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const toggleStatus = (row: MasterRow) => {
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item,
      ),
    )
  }

  const deleteRow = (row: MasterRow) => {
    setRows((current) => current.filter((item) => item.id !== row.id))
  }

  const columns: Column<MasterRow>[] = [
    { key: "code", header: "Código", cell: (row) => <span className="font-mono text-sm font-medium">{row.code}</span> },
    { key: "name", header: "Nombre", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "detail", header: "Detalle", cell: (row) => row.detail || "—" },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge tone={row.status === "active" ? "success" : "neutral"} label={row.status === "active" ? "Activo" : "Inactivo"} />,
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`Editar ${row.name}`} onClick={() => openEdit(row)}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Cambiar estado de ${row.name}`} onClick={() => toggleStatus(row)}>
            <span className="text-xs font-semibold">{row.status === "active" ? "Off" : "On"}</span>
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => deleteRow(row)}>
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            Nuevo {config.singular}
          </Button>
        }
      />

      <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
        <Input
          type="search"
          placeholder="Buscar por código, nombre o detalle"
          aria-label="Buscar registros"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
        getRowKey={(row) => row.id}
        empty={
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No hay registros para mostrar.
          </div>
        }
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? `Editar ${config.singular}` : `Nuevo ${config.singular}`}</DialogTitle>
            <DialogDescription>
              {editingId ? "Actualiza la información del registro." : "Crea un nuevo registro para esta entidad."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="master-code" className="text-sm font-medium">Código</label>
              <Input
                id="master-code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                placeholder="Ej. COD-001"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="master-name" className="text-sm font-medium">Nombre</label>
              <Input
                id="master-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ej. Nombre del registro"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="master-detail" className="text-sm font-medium">Detalle</label>
              <Input
                id="master-detail"
                value={form.detail}
                onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))}
                placeholder="Ej. Dirección, contacto, referencia o descripción"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="master-status" className="text-sm font-medium">Estado</label>
              <select
                id="master-status"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MasterStatus }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveForm} disabled={!form.code.trim() || !form.name.trim()}>
              {editingId ? "Guardar cambios" : "Crear registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
