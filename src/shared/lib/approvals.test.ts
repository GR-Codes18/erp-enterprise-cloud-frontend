import { describe, expect, it } from "vitest"
import {
  APPROVAL_STATUSES,
  APPROVAL_TRANSITIONS,
  canTransitionApproval,
  createApprovalNotification,
} from "./approvals"

describe("approval workflow", () => {
  it("permite solo las transiciones válidas del flujo de aprobación", () => {
    expect(canTransitionApproval("draft", "pending")).toBe(true)
    expect(canTransitionApproval("pending", "approved")).toBe(true)
    expect(canTransitionApproval("pending", "rejected")).toBe(true)
    expect(canTransitionApproval("draft", "approved")).toBe(false)
    expect(canTransitionApproval("approved", "rejected")).toBe(false)
    for (const status of APPROVAL_STATUSES) {
      expect(APPROVAL_TRANSITIONS[status]).toBeDefined()
    }
  })

  it("genera una notificación útil para decisiones de aprobación", () => {
    const notification = createApprovalNotification({
      entity: "Solicitud de compra",
      entityCode: "SC-1002",
      actor: "Gabriel Romero",
      decision: "approved",
    })

    expect(notification.type).toBe("approval")
    expect(notification.status).toBe("approved")
    expect(notification.severity).toBe("success")
    expect(notification.title).toContain("Solicitud de compra")
    expect(notification.message).toContain("Gabriel Romero")
    expect(notification.message).toContain("aprobada")
  })
})
