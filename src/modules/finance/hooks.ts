import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import type { BankAccountInput, BankMovementInput } from "./banks/schema"
import type { CashMovementInput, CloseSessionInput, OpenSessionInput } from "./cash/schema"
import type { PaymentInput } from "./payments/schema"
import type { StatementQuery } from "./statements/schema"
import {
  bankService,
  cashService,
  payableService,
  paymentService,
  receivableService,
  statementService,
} from "./service"

/** Un cobro cambia la cuenta por cobrar, la caja o el banco a la vez: se invalida todo Finanzas */
export const financeKeys = {
  all: ["finance"] as const,
  list: (resource: string, params: unknown) => [...financeKeys.all, resource, params] as const,
}

function useFinanceMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeKeys.all })
      // El saldo y el estado de comprobantes y facturas de compra también cambian
      void queryClient.invalidateQueries({ queryKey: ["sales"] })
      void queryClient.invalidateQueries({ queryKey: ["purchases"] })
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      void queryClient.invalidateQueries({ queryKey: ["reports"] })
    },
  })
}

const listQuery = <T>(resource: string, params: PageParams, fn: (signal: AbortSignal) => Promise<T>, enabled = true) => ({
  queryKey: financeKeys.list(resource, params),
  queryFn: ({ signal }: { signal: AbortSignal }) => fn(signal),
  placeholderData: keepPreviousData,
  enabled,
})

export const useReceivables = (params: PageParams) =>
  useQuery(listQuery("receivables", params, (signal) => receivableService.list(params, signal)))
export const usePayables = (params: PageParams) =>
  useQuery(listQuery("payables", params, (signal) => payableService.list(params, signal)))

export const usePayments = (params: PageParams) =>
  useQuery(listQuery("payments", params, (signal) => paymentService.list(params, signal)))
export const useCreatePayment = () => useFinanceMutation((input: PaymentInput) => paymentService.create(input))
export const useVoidPayment = () =>
  useFinanceMutation(({ id, reason }: { id: string; reason: string }) => paymentService.void(id, reason))

/** Cobros o pagos de un documento (comprobante de venta o factura de proveedor), en solo lectura */
export function useDocumentPayments(documentId: string, { enabled = true }: { enabled?: boolean } = {}) {
  const params: PageParams = { page: 1, size: 100, filters: { document_id: documentId } }
  return useQuery({
    queryKey: financeKeys.list("payments", params),
    queryFn: ({ signal }) => paymentService.list(params, signal),
    enabled: enabled && documentId !== "",
    select: (data) => data.items,
  })
}

export const useCashRegisters = () =>
  useQuery({
    queryKey: financeKeys.list("cash-registers", {}),
    queryFn: ({ signal }) => cashService.registers(signal),
    select: (data) => data.items,
  })
export const useCashSessions = (params: PageParams) =>
  useQuery(listQuery("cash-sessions", params, (signal) => cashService.sessions(params, signal)))
export const useCashSession = (id: string) =>
  useQuery({
    queryKey: financeKeys.list("cash-session", id),
    queryFn: ({ signal }) => cashService.session(id, signal),
    enabled: id !== "",
  })
export const useOpenCashSession = () => useFinanceMutation((input: OpenSessionInput) => cashService.open(input))
export const useAddCashMovement = () =>
  useFinanceMutation(({ id, input }: { id: string; input: CashMovementInput }) => cashService.addMovement(id, input))
export const useCloseCashSession = () =>
  useFinanceMutation(({ id, input }: { id: string; input: CloseSessionInput }) => cashService.close(id, input))

export const useBankAccounts = (params: PageParams) =>
  useQuery(listQuery("bank-accounts", params, (signal) => bankService.list(params, signal)))
export const useCreateBankAccount = () => useFinanceMutation((input: BankAccountInput) => bankService.create(input))
export const useUpdateBankAccount = () =>
  useFinanceMutation(({ id, input }: { id: string; input: BankAccountInput }) => bankService.update(id, input))
export const useBankMovements = (accountId: string, params: PageParams) =>
  useQuery(
    listQuery(`bank-movements-${accountId}`, params, (signal) => bankService.movements(accountId, params, signal), accountId !== ""),
  )
export const useAddBankMovement = () =>
  useFinanceMutation(({ accountId, input }: { accountId: string; input: BankMovementInput }) =>
    bankService.addMovement(accountId, input),
  )
export const useReconcileBankMovement = () =>
  useFinanceMutation(({ accountId, movementId, reconciled }: { accountId: string; movementId: string; reconciled: boolean }) =>
    bankService.reconcile(accountId, movementId, reconciled),
  )

/** Opciones de cuentas bancarias activas (para el formulario de cobro por transferencia) */
export function useBankAccountOptions() {
  const params: PageParams = { page: 1, size: 100, filters: { status: "active" } }
  return useQuery({
    queryKey: financeKeys.list("bank-account-options", params),
    queryFn: ({ signal }) => bankService.list(params, signal),
    select: (data) => data.items,
  })
}

export const useStatement = (query: StatementQuery | null) =>
  useQuery({
    queryKey: financeKeys.list("statement", query),
    queryFn: ({ signal }) => statementService.get(query as StatementQuery, signal),
    enabled: query !== null,
  })
