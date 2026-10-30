import { getAvailableQuantity } from "@/modules/inventory/state"

export type ReservationItem = {
  product_id: string
  warehouse_id: string
  quantity: number
}

export type ReservationSummaryInput = {
  status: string
  items: ReservationItem[]
  stockByKey?: Record<string, number>
}

export type ReservationSummary = {
  isReserved: boolean
  message: string
  details: Array<{ product_id: string; warehouse_id: string; quantity: number; available: number }>
}

function getAvailableForItem(item: ReservationItem, stockByKey?: Record<string, number>) {
  if (stockByKey) {
    return stockByKey[`${item.product_id}:${item.warehouse_id}`] ?? 0
  }

  return getAvailableQuantity(item.product_id, item.warehouse_id)
}

export function getReservationSummary(input: ReservationSummaryInput): ReservationSummary {
  const status = input.status
  const items = input.items ?? []

  if (status !== "reserved" && status !== "confirmed" && status !== "invoiced") {
    return {
      isReserved: false,
      message: "La orden aún no ha reservado stock.",
      details: [],
    }
  }

  const details = items.map((item) => ({
    ...item,
    available: getAvailableForItem(item, input.stockByKey),
  }))

  const shortages = details.filter((item) => item.quantity > item.available)

  if (shortages.length > 0) {
    return {
      isReserved: false,
      message: `No se pudo reservar stock suficiente para ${shortages.length} producto(s): ${shortages
        .map((item) => `${item.product_id} (${item.available} disponible, ${item.quantity} pedido)`) 
        .join("; ")}.`,
      details,
    }
  }

  return {
    isReserved: true,
    message: "stock reservado para la confirmación de la orden de venta.",
    details,
  }
}
