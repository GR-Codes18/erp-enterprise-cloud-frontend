/** Contadores en vivo de cada integración entre áreas (ver connections/rules.ts) */
export interface IntegrationFlowStats {
  id: string
  /** Eventos que esta integración ya procesó */
  eventos: number
  /** Fecha y hora UTC (ISO 8601) del último evento procesado; null si aún no hubo */
  ultimo_evento: string | null
}

export type NotificationKind = "approval" | "alert"

/** Alerta o solicitud de aprobación generada a partir de un evento de otro módulo */
export interface IntegrationNotification {
  id: string
  tipo: NotificationKind
  titulo: string
  detalle: string
  /** Módulo donde ocurrió el evento (texto legible) */
  origen: string
  /** Fecha y hora UTC (ISO 8601) */
  creada: string
}
