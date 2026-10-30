/** Reglas generales de las integraciones externas (11.8) */
export const INTEGRATION_RULES = [
  "Las integraciones externas se habilitan según necesidad, contratación y requisitos legales vigentes.",
  "Registrar fallos y reintentos; las operaciones reintentadas no deben duplicar transacciones.",
] as const

/** Integración entre áreas del sistema: qué ocurre y qué se espera cuando pasa */
export interface IntegrationFlow {
  id: string
  origen: string
  destino: string
  evento: string
  accion_esperada: string
}

export const INTEGRATION_FLOWS: IntegrationFlow[] = [
  {
    id: "flow-seguridad-auditoria",
    origen: "Seguridad y Auditoría",
    destino: "Todos",
    evento: "Acción crítica",
    accion_esperada: "Validar permisos y registrar trazabilidad.",
  },
  {
    id: "flow-notificaciones-aprobaciones",
    origen: "Notificaciones y Aprobaciones",
    destino: "Todos",
    evento: "Evento o solicitud de aprobación",
    accion_esperada: "Gestionar alertas y transiciones permitidas.",
  },
]
