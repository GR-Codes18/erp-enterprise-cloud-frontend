import { PURCHASE_ORDER_STATUS_LABELS, type PurchaseOrder } from "./schema"

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`

export function purchaseOrdersToCsv(orders: readonly PurchaseOrder[]) {
  const rows = [
    ["Número", "Proveedor", "Fecha de creación", "Entrega esperada", "Estado", "Total (S/)"],
    ...orders.map((order) => [
      order.number,
      order.supplier_name,
      order.created_at.slice(0, 10),
      order.expected_date,
      PURCHASE_ORDER_STATUS_LABELS[order.status],
      order.total,
    ]),
  ]
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`
}
