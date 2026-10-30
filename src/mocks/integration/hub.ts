import { delay, http, HttpResponse } from "msw"
import type { SetupWorker } from "msw/browser"
import { env } from "@/config/env"
import { sessionUserId, USER_NAMES } from "@/mocks/refs"
import { appendAuditEvent } from "@/modules/administration/audit/mocks"
import type { AuditAction, AuditModule } from "@/modules/administration/audit/schema"
import { appendLogbookEntry } from "@/modules/administration/logbook/mock"
import type {
  IntegrationFlowStats,
  IntegrationNotification,
  NotificationKind,
} from "@/modules/administration/integration/types"
import { newId } from "@/shared/lib/id"
import type { Paginated } from "@/shared/lib/api/types"

/**
 * Capa de integración entre módulos (simulada).
 *
 * Escucha cada cambio (POST, PUT, PATCH, DELETE) que cualquier módulo hace a la API y:
 *  - Seguridad y Auditoría: registra la trazabilidad en la Bitácora y en Auditoría.
 *  - Notificaciones y Aprobaciones: genera alertas y solicitudes de aprobación.
 * Así, cuando un módulo cambia, los módulos relacionados cambian solos, sin que cada
 * pantalla tenga que avisarles. Con el backend real esta capa la hace el servidor.
 */

// Ids de las integraciones: los mismos de administration/connections/rules.ts
const FLOW_SECURITY = "flow-seguridad-auditoria"
const FLOW_NOTIFICATIONS = "flow-notificaciones-aprobaciones"

// Rutas que la capa ignora: son la propia trazabilidad o la sesión (evita registrar el registro)
const IGNORED_PREFIXES = ["auth", "audit", "logbook", "integration"]

const RESOURCE_LABELS: Record<string, string> = {
  users: "Usuario",
  roles: "Rol",
  permissions: "Permiso",
  series: "Serie",
  backups: "Respaldo",
  connections: "Conexión",
  customers: "Cliente",
  suppliers: "Proveedor",
  products: "Producto",
  categories: "Categoría",
  warehouses: "Almacén",
  commissions: "Comisión",
  "sales/quotes": "Cotización",
  "sales/orders": "Orden de venta",
  "sales/invoices": "Comprobante",
  "sales/returns": "Devolución de venta",
  "purchases/requests": "Solicitud de compra",
  "purchases/orders": "Orden de compra",
  "purchases/receptions": "Recepción",
  "purchases/invoices": "Factura de proveedor",
  "purchases/returns": "Devolución de compra",
  "inventory/adjustments": "Ajuste de inventario",
  "inventory/transfers": "Transferencia",
  "finance/bank-accounts": "Cuenta bancaria",
  "logistics/shipments": "Envío",
}

const MODULE_BY_ROOT: Record<string, AuditModule> = {
  sales: "sales",
  purchases: "purchases",
  inventory: "inventory",
  finance: "finance",
  logistics: "inventory",
  documents: "documents",
  customers: "maintenance",
  suppliers: "maintenance",
  products: "maintenance",
  categories: "maintenance",
  warehouses: "maintenance",
}

const MODULE_LABELS: Record<AuditModule, string> = {
  auth: "Acceso",
  administration: "Administración",
  maintenance: "Maestro",
  sales: "Ventas",
  purchases: "Compras",
  inventory: "Inventario",
  finance: "Finanzas",
  documents: "Documentos",
}

const ACTION_VERBS: Record<string, { audit: AuditAction; text: string }> = {
  create: { audit: "create", text: "Crear" },
  update: { audit: "update", text: "Editar" },
  delete: { audit: "delete", text: "Eliminar" },
  void: { audit: "void", text: "Anular" },
  approve: { audit: "approve", text: "Aprobar" },
  reject: { audit: "update", text: "Rechazar" },
  submit: { audit: "update", text: "Enviar a aprobación" },
  confirm: { audit: "update", text: "Confirmar" },
  cancel: { audit: "void", text: "Cancelar" },
  run: { audit: "update", text: "Ejecutar" },
}

// Estado en memoria (se reinicia al recargar, igual que el resto de los datos simulados)
const notifications: IntegrationNotification[] = []
const flowStats: Record<string, IntegrationFlowStats> = {
  [FLOW_SECURITY]: { id: FLOW_SECURITY, eventos: 0, ultimo_evento: null },
  [FLOW_NOTIFICATIONS]: { id: FLOW_NOTIFICATIONS, eventos: 0, ultimo_evento: null },
}

function touch(flowId: string, at: string) {
  flowStats[flowId].eventos += 1
  flowStats[flowId].ultimo_evento = at
}

function notify(tipo: NotificationKind, titulo: string, detalle: string, origen: string, at: string) {
  notifications.unshift({ id: newId(), tipo, titulo, detalle, origen, creada: at })
  touch(FLOW_NOTIFICATIONS, at)
}

interface ParsedOperation {
  resource: string
  verb: string
  module: AuditModule
}

/** Deduce recurso, acción y módulo a partir del método y la ruta, ej. POST /sales/orders/<id>/approve */
function parseOperation(method: string, pathname: string): ParsedOperation | undefined {
  const base = new URL(env.apiBaseUrl).pathname.replace(/\/+$/, "")
  const segments = pathname.slice(base.length).split("/").filter(Boolean)
  if (segments.length === 0 || IGNORED_PREFIXES.includes(segments[0])) return undefined

  // Recurso: el prefijo más largo que conocemos ("sales/orders" antes que "sales")
  const twoLevel = segments.slice(0, 2).join("/")
  const resource = twoLevel in RESOURCE_LABELS ? twoLevel : segments[0]
  const rest = segments.slice(resource.split("/").length)

  let verb: string
  if (method === "DELETE") verb = "delete"
  else if (method === "POST" && rest.length === 0) verb = "create"
  else if (method === "POST" && rest.length >= 2) verb = rest[rest.length - 1]
  else verb = "update"

  return { resource, verb, module: MODULE_BY_ROOT[segments[0]] ?? "administration" }
}

/** Texto legible del registro afectado, tomado de la respuesta (número, código o nombre) */
async function recordRef(response: Response): Promise<string> {
  if (!response.ok || response.status === 204) return ""
  try {
    const body = (await response.clone().json()) as Record<string, unknown>
    const ref = body.number ?? body.code ?? body.name ?? body.serie ?? body.proveedor ?? body.destino
    return typeof ref === "string" ? ref : ""
  } catch {
    return ""
  }
}

async function handleOperation(request: Request, response: Response) {
  if (request.method === "GET" || request.method === "OPTIONS" || request.method === "HEAD") return
  const operation = parseOperation(request.method, new URL(request.url).pathname)
  if (!operation) return

  const at = new Date().toISOString()
  const ok = response.status < 400
  const userId = sessionUserId(request)
  const userName = USER_NAMES[userId] ?? "Usuario en sesión"
  const verb = ACTION_VERBS[operation.verb] ?? { audit: "update" as AuditAction, text: operation.verb }
  const label = RESOURCE_LABELS[operation.resource] ?? operation.resource
  const ref = await recordRef(response)
  const record = ref ? `${label}: ${ref}` : label

  // Seguridad y Auditoría: acción crítica → trazabilidad
  appendLogbookEntry({
    usuario: userName,
    accion: `${verb.text} ${record}`,
    fecha_hora: at,
    resultado: ok ? "Exitoso" : "Fallido",
    ip: null,
  })
  appendAuditEvent({
    user_id: userId,
    user_name: userName,
    action: verb.audit,
    module: operation.module,
    record,
    result: ok ? "success" : "failure",
    created_at: at,
  })
  touch(FLOW_SECURITY, at)

  // Notificaciones y Aprobaciones: eventos que piden gestionar alertas o aprobaciones
  const origen = MODULE_LABELS[operation.module]
  if (!ok) {
    notify("alert", `No se pudo ${verb.text.toLowerCase()}: ${label}`, `${userName} intentó la operación y fue rechazada (${response.status}).`, origen, at)
  } else if (operation.verb === "submit") {
    notify("approval", `Solicitud de aprobación: ${record}`, `${userName} envió el registro a aprobación.`, origen, at)
  } else if (operation.verb === "approve" || operation.verb === "reject") {
    const decision = operation.verb === "approve" ? "aprobó" : "rechazó"
    notify("approval", `${label} ${operation.verb === "approve" ? "aprobada" : "rechazada"}: ${ref || "registro"}`, `${userName} ${decision} la solicitud.`, origen, at)
  } else if (operation.verb === "void" || operation.verb === "cancel") {
    notify("alert", `Anulación registrada: ${record}`, `${userName} anuló el registro.`, origen, at)
  }
}

/** Conecta la capa de integración al worker: cada respuesta simulada pasa por aquí */
export function connectIntegrationHub(worker: SetupWorker) {
  worker.events.on("response:mocked", ({ request, response }) => {
    void handleOperation(request, response).catch(() => {
      // La integración nunca debe romper la operación original
    })
  })
}

export const integrationHandlers = [
  http.get(`${env.apiBaseUrl}/integration/flows`, async () => {
    await delay(150)
    return HttpResponse.json(Object.values(flowStats))
  }),

  http.get(`${env.apiBaseUrl}/integration/notifications`, async ({ request }) => {
    await delay(150)
    const params = new URL(request.url).searchParams
    const size = Math.min(Math.max(Number(params.get("size")) || 10, 1), 100)
    const page = Math.max(Number(params.get("page")) || 1, 1)
    const body: Paginated<IntegrationNotification> = {
      items: notifications.slice((page - 1) * size, page * size),
      total: notifications.length,
      page,
      size,
      pages: Math.max(1, Math.ceil(notifications.length / size)),
    }
    return HttpResponse.json(body)
  }),
]
