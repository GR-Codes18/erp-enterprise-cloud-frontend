import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useListsByStatus } from "@/shared/hooks/useListsByStatus"
import type { PageParams } from "@/shared/lib/api/types"
import type { InvoiceStatus, IssueInvoiceInput } from "./invoices/schema"
import type { DeliveryStatus, OrderInput } from "./orders/schema"
import type { QuoteInput } from "./quotes/schema"
import type { ReturnInput } from "./returns/schema"
import { invoiceService, orderService, quoteService, returnService } from "./service"

/**
 * Todas las consultas de Ventas cuelgan de ["sales"]: una acción (convertir, emitir, anular...)
 * cambia varios documentos a la vez, así que se invalida el módulo completo.
 */
export const salesKeys = {
  all: ["sales"] as const,
  list: (resource: string, params: PageParams) => [...salesKeys.all, resource, "list", params] as const,
  detail: (resource: string, id: string) => [...salesKeys.all, resource, "detail", id] as const,
}

function useInvalidateSales() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: salesKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["stock"] }),
      queryClient.invalidateQueries({ queryKey: ["kardex"] }),
      queryClient.invalidateQueries({ queryKey: ["finance"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ])
}

/** Mutación de Ventas que, al terminar bien, refresca todos sus listados y detalles */
function useSalesMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const invalidate = useInvalidateSales()
  return useMutation({ mutationFn, onSuccess: invalidate })
}

// Cotizaciones
export const useQuotes = (params: PageParams) =>
  useQuery({
    queryKey: salesKeys.list("quotes", params),
    queryFn: ({ signal }) => quoteService.list(params, signal),
    placeholderData: keepPreviousData,
  })
export const useQuote = (id: string) =>
  useQuery({
    queryKey: salesKeys.detail("quotes", id),
    queryFn: ({ signal }) => quoteService.get(id, signal),
    enabled: id !== "",
  })
export const useCreateQuote = () => useSalesMutation((input: QuoteInput) => quoteService.create(input))
export const useUpdateQuote = () =>
  useSalesMutation(({ id, input }: { id: string; input: QuoteInput }) => quoteService.update(id, input))
export const useDeleteQuote = () => useSalesMutation((id: string) => quoteService.remove(id))
export const useSendQuote = () => useSalesMutation((id: string) => quoteService.send(id))
export const useAcceptQuote = () => useSalesMutation((id: string) => quoteService.accept(id))
export const useRejectQuote = () =>
  useSalesMutation(({ id, reason }: { id: string; reason: string }) => quoteService.reject(id, reason))
export const useConvertQuote = () => useSalesMutation((id: string) => quoteService.convert(id))

// Pedidos
export const useOrders = (params: PageParams, enabled = true) =>
  useQuery({
    queryKey: salesKeys.list("orders", params),
    queryFn: ({ signal }) => orderService.list(params, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
export const useOrder = (id: string) =>
  useQuery({
    queryKey: salesKeys.detail("orders", id),
    queryFn: ({ signal }) => orderService.get(id, signal),
    enabled: id !== "",
  })
export const useCreateOrder = () => useSalesMutation((input: OrderInput) => orderService.create(input))
export const useUpdateOrder = () =>
  useSalesMutation(({ id, input }: { id: string; input: OrderInput }) => orderService.update(id, input))
export const useDeleteOrder = () => useSalesMutation((id: string) => orderService.remove(id))
export const useConfirmOrder = () => useSalesMutation((id: string) => orderService.confirm(id))
export const useReserveOrder = () =>
  useSalesMutation(({ id, expires_at }: { id: string; expires_at: string }) => orderService.reserve(id, expires_at))
export const useReleaseReservation = () => useSalesMutation((id: string) => orderService.release(id))
export const useCancelOrder = () =>
  useSalesMutation(({ id, reason }: { id: string; reason: string }) => orderService.cancel(id, reason))
export const useUpdateDeliveryStatus = () =>
  useSalesMutation(({ id, status }: { id: string; status: DeliveryStatus }) => orderService.updateDeliveryStatus(id, status))
export const useIssueInvoice = () =>
  useSalesMutation(({ id, input }: { id: string; input: IssueInvoiceInput }) => orderService.issueInvoice(id, input))

// Comprobantes
export const useInvoices = (params: PageParams) =>
  useQuery({
    queryKey: salesKeys.list("invoices", params),
    queryFn: ({ signal }) => invoiceService.list(params, signal),
    placeholderData: keepPreviousData,
  })
export const useInvoice = (id: string) =>
  useQuery({
    queryKey: salesKeys.detail("invoices", id),
    queryFn: ({ signal }) => invoiceService.get(id, signal),
    enabled: id !== "",
  })
export const useVoidInvoice = () =>
  useSalesMutation(({ id, reason }: { id: string; reason: string }) => invoiceService.void(id, reason))

// Devoluciones
export const useReturns = (params: PageParams) =>
  useQuery({
    queryKey: salesKeys.list("returns", params),
    queryFn: ({ signal }) => returnService.list(params, signal),
    placeholderData: keepPreviousData,
  })
export const useReturn = (id: string) =>
  useQuery({
    queryKey: salesKeys.detail("returns", id),
    queryFn: ({ signal }) => returnService.get(id, signal),
    enabled: id !== "",
  })
export const useCreateReturn = () => useSalesMutation((input: ReturnInput) => returnService.create(input))
export const useUpdateReturn = () =>
  useSalesMutation(({ id, input }: { id: string; input: ReturnInput }) => returnService.update(id, input))
export const useDeleteReturn = () => useSalesMutation((id: string) => returnService.remove(id))
export const useConfirmReturn = () => useSalesMutation((id: string) => returnService.confirm(id))

export interface SalesInvoiceOption {
  id: string
  code: string
  customer_id: string
  customer_name: string
  balance: string
}

/** Comprobantes con saldo por cobrar, para el formulario de cobro de Finanzas (regla 0.5) */
/** Comprobantes en los estados pedidos, filtrados en el servidor */
export const useInvoicesByStatus = (statuses: readonly InvoiceStatus[]) =>
  useListsByStatus([...salesKeys.all, "invoices"], statuses, invoiceService.list)

export function useSalesInvoiceOptions() {
  const invoices = useInvoicesByStatus(["issued", "partially_paid"])
  const data: SalesInvoiceOption[] | undefined = invoices.data?.map((invoice) => ({
    id: invoice.id,
    code: `${invoice.series}-${invoice.number}`,
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name,
    balance: invoice.balance,
  }))
  return { ...invoices, data }
}
