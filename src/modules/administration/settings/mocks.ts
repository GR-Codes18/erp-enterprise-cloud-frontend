import { createCrudHandlers } from "@/mocks/utils/crud"
import type { Settings } from "./schema"

/** UUID fijo con el prefijo de configuración (8014) */
const seed: Settings[] = [
  {
    id: "00000000-0000-4000-8014-000000000001",
    company_ruc: "20600000001",
    company_name: "Enterprise Cloud S.A.C.",
    company_address: "Av. Javier Prado Este 1234, San Isidro, Lima",
    igv_rate: "18.00",
    currency: "PEN",
    invoice_series: "F001",
    receipt_series: "B001",
    block_negative_stock: true,
  },
]

export const settingsHandlers = createCrudHandlers<Settings>({
  resource: "settings",
  seed,
  searchFields: ["company_name"],
  filterFields: [],
})