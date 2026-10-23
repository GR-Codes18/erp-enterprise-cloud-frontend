export type StatusTone = "success" | "warning" | "danger" | "neutral"

interface StatusBadgeProps {
  tone: StatusTone
  label: string
}

// Clases completas y literales: Tailwind no detecta nombres armados con texto dinámico
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-danger-soft text-danger-text",
  neutral: "bg-neutral-soft text-neutral-text",
}

/** Estado con texto visible: el color nunca es lo único que lo comunica. */
export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  )
}