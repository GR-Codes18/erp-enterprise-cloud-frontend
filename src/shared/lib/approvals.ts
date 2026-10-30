import type { StatusTone } from "@/shared/components/StatusBadge"

export const APPROVAL_STATUSES = ["draft", "pending", "approved", "rejected"] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const APPROVAL_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ["pending"],
  pending: ["approved", "rejected"],
  approved: [],
  rejected: [],
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente de aprobación",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export const APPROVAL_STATUS_TONES: Record<ApprovalStatus, StatusTone> = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
}

export function canTransitionApproval(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return APPROVAL_TRANSITIONS[from].includes(to)
}

export type ApprovalDecision = "approved" | "rejected"
export type ApprovalNotificationSeverity = "info" | "success" | "warning" | "danger"

export interface ApprovalNotification {
  id: string
  type: "approval"
  status: ApprovalStatus
  severity: ApprovalNotificationSeverity
  title: string
  message: string
  entity: string
  entityCode: string
  createdAt: string
}

export function canDecideApproval(
  approval: { status: ApprovalStatus; requested_by?: string },
  userId: string | undefined,
): boolean {
  return approval.status === "pending" && userId !== undefined && approval.requested_by !== userId
}

export function createApprovalNotification({
  entity,
  entityCode,
  actor,
  decision,
  reason,
}: {
  entity: string
  entityCode: string
  actor: string
  decision: ApprovalDecision
  reason?: string
}): ApprovalNotification {
  const agreed = decision === "approved"
  const decisionLabel = agreed ? "aprobada" : "rechazada"

  return {
    id: `approval-${Date.now()}`,
    type: "approval",
    status: decision,
    severity: agreed ? "success" : "danger",
    title: `${entity} ${entityCode}`,
    message: `${actor} ${agreed ? "aprobó" : "rechazó"} ${entity.toLowerCase()} ${entityCode} y quedó ${decisionLabel}${reason ? `: ${reason}` : "."}`,
    entity,
    entityCode,
    createdAt: new Date().toISOString(),
  }
}
