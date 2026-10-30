import { describe, expect, it } from "vitest"
import { purchaseOrdersToCsv } from "./csv"
import type { PurchaseOrder } from "./schema"

const order: PurchaseOrder = {
  id: "order-1",
  number: "OC-000001",
  supplier_id: "supplier-1",
  supplier_name: 'Ferretería "El Sol", S.A.C.',
  request_id: "",
  request_number: "",
  items: [],
  expected_date: "2026-10-20",
  notes: "",
  status: "partially_received",
  subtotal: "100.00",
  igv: "18.00",
  total: "118.00",
  cancel_reason: "",
  created_at: "2026-10-15T14:00:00Z",
}

describe("exportación CSV de órdenes de compra", () => {
  it("incluye BOM, encabezados y escapa comillas en datos del proveedor", () => {
    const csv = purchaseOrdersToCsv([order])

    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain('"Número","Proveedor","Fecha de creación","Entrega esperada","Estado","Total (S/)"')
    expect(csv).toContain('"OC-000001","Ferretería ""El Sol"", S.A.C.","2026-10-15","2026-10-20","Recepción parcial","118.00"')
  })

  it("exporta solo encabezados cuando no hay órdenes coincidentes", () => {
    expect(purchaseOrdersToCsv([])).toBe(
      '\uFEFF"Número","Proveedor","Fecha de creación","Entrega esperada","Estado","Total (S/)"',
    )
  })
})
