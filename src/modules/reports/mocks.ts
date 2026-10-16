import { delay, http, HttpResponse, type RequestHandler } from "msw"
import { env } from "@/config/env"
import { PRODUCTS, findProduct, productRef } from "@/mocks/refs"
import { financeSnapshot } from "@/modules/finance/mocks"
import { currentPurchaseOrders, currentSupplierInvoices } from "@/modules/purchases/mocks"
import { currentSalesInvoices, currentSalesOrders } from "@/modules/sales/mocks"
import type { ApiErrorBody } from "@/shared/lib/api/types"
import { addDays, isBusinessDate, todayInLima } from "@/shared/lib/dates"
import { baseFromTotal, calculateTotals } from "@/shared/lib/tax"
import { fromCents, toCents } from "@/shared/lib/money"
import { grossMarginPercent, type Dashboard } from "@/modules/dashboard/schema"
import type { LowStockRow, MonthlyPoint, PurchasesReportRow, ReportPage, SalesReportRow, TopProduct } from "./schema"

/**
 * Agregados que en producción calcula el backend; aquí se derivan de los mismos datos semilla
 * de Ventas, Compras y Finanzas para que todo cuadre al navegar.
 */
const base = (path: string) => `${env.apiBaseUrl}/reports/${path}`
const errorResponse = (status: number, code: string, message: string) =>
  HttpResponse.json<ApiErrorBody>({ code, message }, { status })

function readPeriod(request: Request) {
  const params = new URL(request.url).searchParams
  const today = todayInLima()
  const from = params.get("date_from") || addDays(today, -89)
  const to = params.get("date_to") || today
  if (!isBusinessDate(from) || !isBusinessDate(to)) return { error: errorResponse(400, "BAD_REQUEST", "Fecha no válida, usa el formato AAAA-MM-DD") }
  if (from > to) return { error: errorResponse(422, "VALIDATION_ERROR", "La fecha inicial no puede ser mayor que la final") }
  return { from, to, params }
}

const inPeriod = (date: string, from: string, to: string) => date >= from && date <= to

/** Valor con IGV de lo devuelto en un comprobante (devoluciones confirmadas) */
const returnedCents = (invoice: ReturnType<typeof currentSalesInvoices>[number]) =>
  calculateTotals(invoice.items.reduce((sum, item) => sum + item.returned_quantity * toCents(item.unit_price), 0)).totalCents

const activeSales = (from: string, to: string) =>
  currentSalesInvoices().filter((invoice) => invoice.status !== "void" && inPeriod(invoice.issue_date, from, to))
const activePurchases = (from: string, to: string) =>
  currentSupplierInvoices().filter((invoice) => invoice.status !== "void" && inPeriod(invoice.issue_date, from, to))

/** Ventas netas: comprobantes emitidos sin anulados, menos devoluciones */
const netSalesCents = (from: string, to: string) =>
  activeSales(from, to).reduce((sum, invoice) => sum + toCents(invoice.total) - returnedCents(invoice), 0)

/** Costo de lo vendido (sin IGV), con el costo actual de cada producto */
const costOfSalesCents = (from: string, to: string) =>
  activeSales(from, to).reduce(
    (sum, invoice) =>
      sum +
      invoice.items.reduce((lines, item) => {
        const cost = findProduct(item.product_id)?.cost_price ?? "0.00"
        return lines + (item.quantity - item.returned_quantity) * toCents(cost)
      }, 0),
    0,
  )

const lowStock = () =>
  PRODUCTS.filter((product) => product.stock_total <= product.min_stock).map(
    (product): LowStockRow => ({
      product_id: productRef(product.n),
      sku: product.sku,
      product_name: product.name,
      unit: product.unit,
      stock: product.stock_total,
      min_stock: product.min_stock,
      shortfall: product.min_stock - product.stock_total,
    }),
  )

function paged<T>(rows: T[], params: URLSearchParams, sum: string): ReportPage<T> {
  const page = Math.max(1, Number(params.get("page")) || 1)
  const size = Math.min(100, Math.max(1, Number(params.get("size")) || 20))
  return { items: rows.slice((page - 1) * size, page * size), total: rows.length, page, size, pages: Math.max(1, Math.ceil(rows.length / size)), sum }
}

const INVOICE_STATUS_LABELS: Record<string, string> = { issued: "Emitido", partially_paid: "Pago parcial", paid: "Pagado", void: "Anulado" }
const SUPPLIER_STATUS_LABELS: Record<string, string> = { registered: "Registrada", paid: "Pagada", void: "Anulada" }

export const reportHandlers: RequestHandler[] = [
  http.get(base("dashboard"), async ({ request }) => {
    await delay(350)
    const period = readPeriod(request)
    if ("error" in period) return period.error
    const { from, to } = period
    const today = todayInLima()
    const { receivables, payables } = financeSnapshot()
    const sales = netSalesCents(from, to)
    const cost = costOfSalesCents(from, to)
    const inventoryValue = PRODUCTS.reduce((sum, product) => sum + product.stock_total * toCents(product.cost_price), 0)
    const critical = lowStock()

    const body: Dashboard = {
      date_from: from,
      date_to: to,
      sales: fromCents(sales),
      purchases: fromCents(activePurchases(from, to).reduce((sum, invoice) => sum + toCents(invoice.total), 0)),
      cost_of_sales: fromCents(cost),
      // Ventas netas sin IGV menos costo de lo vendido
      gross_profit: fromCents(baseFromTotal(sales) - cost),
      gross_margin: (() => {
        const margin = grossMarginPercent(baseFromTotal(sales), baseFromTotal(sales) - cost)
        return margin === null ? "" : margin.toFixed(1)
      })(),
      critical_stock_count: critical.length,
      receivables: {
        total: fromCents(receivables.reduce((sum, row) => sum + toCents(row.balance), 0)),
        overdue: fromCents(receivables.filter((row) => row.status === "overdue").reduce((sum, row) => sum + toCents(row.balance), 0)),
      },
      payables: {
        total: fromCents(payables.reduce((sum, row) => sum + toCents(row.balance), 0)),
        due_soon: fromCents(
          payables
            .filter((row) => row.status !== "paid" && row.due_date >= today && row.due_date <= addDays(today, 7))
            .reduce((sum, row) => sum + toCents(row.balance), 0),
        ),
      },
      // Inventario promedio aproximado con el valor actual (el backend usa el promedio del periodo)
      inventory_turnover: inventoryValue === 0 ? "0.00" : (cost / inventoryValue).toFixed(2),
      alerts: {
        low_stock: critical.map(({ product_id, product_name, unit, stock, min_stock }) => ({ product_id, product_name, unit, stock, min_stock })),
        overdue_receivables: receivables
          .filter((row) => row.status === "overdue")
          .map(({ invoice_id, invoice_code, customer_name, balance, due_date }) => ({ invoice_id, invoice_code, customer_name, balance, due_date })),
        orders_to_invoice: currentSalesOrders()
          .filter((order) => order.status === "confirmed")
          .map(({ id, number, customer_name, total }) => ({ id, number, customer_name, total })),
        pending_deliveries: currentSalesOrders()
          .filter(
            (order) =>
              order.sale_type === "wholesale" &&
              order.delivery_method !== "none" &&
              (order.status === "confirmed" || order.status === "invoiced") &&
              (order.delivery_status === "pending" ||
                order.delivery_status === "in_transit" ||
                order.delivery_status === "ready_for_pickup"),
          )
          .map((order) => ({
            id: order.id,
            number: order.number,
            customer_name: order.customer_name,
            method: order.delivery_method === "pickup" ? "pickup" as const : "shipping" as const,
            status:
              order.delivery_status === "pending"
                ? "pending" as const
                : order.delivery_status === "in_transit"
                  ? "in_transit" as const
                  : "ready_for_pickup" as const,
          })),
        purchase_orders_to_receive: currentPurchaseOrders()
          .filter((order) => order.status === "issued" || order.status === "partially_received")
          .map(({ id, number, supplier_name, expected_date, status }) => ({
            id,
            number,
            supplier_name,
            expected_date,
            status: status === "issued" ? "issued" as const : "partially_received" as const,
          })),
      },
    }
    return HttpResponse.json(body)
  }),

  http.get(base("sales"), async ({ request }) => {
    await delay(300)
    const period = readPeriod(request)
    if ("error" in period) return period.error
    const customerId = period.params.get("customer_id")
    const rows = currentSalesInvoices()
      .filter((invoice) => inPeriod(invoice.issue_date, period.from, period.to) && (!customerId || invoice.customer_id === customerId))
      .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
    const sum = rows.filter((invoice) => invoice.status !== "void").reduce((total, invoice) => total + toCents(invoice.total), 0)
    return HttpResponse.json(
      paged<SalesReportRow>(
        rows.map((invoice) => ({
          invoice_id: invoice.id,
          code: `${invoice.series}-${invoice.number}`,
          type_label: invoice.type === "invoice" ? "Factura" : "Boleta",
          issue_date: invoice.issue_date,
          customer_name: invoice.customer_name,
          total: invoice.total,
          status_label: INVOICE_STATUS_LABELS[invoice.status],
        })),
        period.params,
        fromCents(sum),
      ),
    )
  }),

  http.get(base("purchases"), async ({ request }) => {
    await delay(300)
    const period = readPeriod(request)
    if ("error" in period) return period.error
    const supplierId = period.params.get("supplier_id")
    const rows = currentSupplierInvoices()
      .filter((invoice) => inPeriod(invoice.issue_date, period.from, period.to) && (!supplierId || invoice.supplier_id === supplierId))
      .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
    const sum = rows.filter((invoice) => invoice.status !== "void").reduce((total, invoice) => total + toCents(invoice.total), 0)
    return HttpResponse.json(
      paged<PurchasesReportRow>(
        rows.map((invoice) => ({
          invoice_id: invoice.id,
          code: `${invoice.series}-${invoice.number}`,
          issue_date: invoice.issue_date,
          supplier_name: invoice.supplier_name,
          total: invoice.total,
          status_label: SUPPLIER_STATUS_LABELS[invoice.status],
        })),
        period.params,
        fromCents(sum),
      ),
    )
  }),

  http.get(base("low-stock"), async ({ request }) => {
    await delay(300)
    return HttpResponse.json(paged(lowStock(), new URL(request.url).searchParams, ""))
  }),

  http.get(base("analytics/monthly"), async ({ request }) => {
    await delay(350)
    const period = readPeriod(request)
    if ("error" in period) return period.error
    // Un punto por mes del rango, aunque no tenga movimientos (los ceros también son datos)
    const months: string[] = []
    for (let cursor = `${period.from.slice(0, 7)}-01`; cursor.slice(0, 7) <= period.to.slice(0, 7); ) {
      months.push(cursor.slice(0, 7))
      const [year, month] = cursor.split("-").map(Number)
      cursor = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`
    }
    const points: MonthlyPoint[] = months.map((month) => {
      const from = `${month}-01`
      const to = `${month}-31`
      return {
        month,
        sales: fromCents(netSalesCents(from, to)),
        purchases: fromCents(activePurchases(from, to).reduce((sum, invoice) => sum + toCents(invoice.total), 0)),
      }
    })
    return HttpResponse.json(points)
  }),

  http.get(base("analytics/top-products"), async ({ request }) => {
    await delay(350)
    const period = readPeriod(request)
    if ("error" in period) return period.error
    const totals = new Map<string, { quantity: number; cents: number }>()
    for (const invoice of activeSales(period.from, period.to)) {
      for (const item of invoice.items) {
        const sold = item.quantity - item.returned_quantity
        const current = totals.get(item.product_id) ?? { quantity: 0, cents: 0 }
        totals.set(item.product_id, { quantity: current.quantity + sold, cents: current.cents + sold * toCents(item.unit_price) })
      }
    }
    const top: TopProduct[] = [...totals.entries()]
      .map(([product_id, value]) => ({
        product_id,
        product_name: findProduct(product_id)?.name ?? "Producto",
        quantity: value.quantity,
        amount: fromCents(value.cents),
      }))
      .sort((a, b) => toCents(b.amount) - toCents(a.amount))
      .slice(0, 5)
    return HttpResponse.json(top)
  }),
]
