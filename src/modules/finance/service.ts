import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Payable, Receivable } from "./accounts/schema"
import type { BankAccount, BankAccountInput, BankMovement, BankMovementInput } from "./banks/schema"
import type { CashMovementInput, CashRegister, CashSession, CloseSessionInput, OpenSessionInput } from "./cash/schema"
import type { Payment, PaymentInput } from "./payments/schema"
import type { Statement, StatementQuery } from "./statements/schema"

const path = (base: string, id: string, action?: string) =>
  `${base}/${encodeURIComponent(id)}${action ? `/${action}` : ""}`

export const receivableService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Receivable>>("/finance/receivables", { query: toListQuery(params), signal }),
}

export const payableService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Payable>>("/finance/payables", { query: toListQuery(params), signal }),
}

const PAYMENTS = "/finance/payments"
export const paymentService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Payment>>(PAYMENTS, { query: toListQuery(params), signal }),
  /** El backend valida saldo, caja abierta (efectivo) y cuenta (transferencia), y actualiza el documento */
  create: (input: PaymentInput) => api.post<Payment>(PAYMENTS, input),
  /** No se edita: se anula con motivo y el saldo se restituye */
  void: (id: string, reason: string) => api.post<Payment>(path(PAYMENTS, id, "void"), { reason }),
}

const CASH = "/finance/cash"
export const cashService = {
  registers: (signal?: AbortSignal) => api.get<Paginated<CashRegister>>(`${CASH}/registers`, { query: { size: 100 }, signal }),
  sessions: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<CashSession>>(`${CASH}/sessions`, { query: toListQuery(params), signal }),
  session: (id: string, signal?: AbortSignal) => api.get<CashSession>(path(`${CASH}/sessions`, id), { signal }),
  open: (input: OpenSessionInput) => api.post<CashSession>(`${CASH}/sessions`, input),
  addMovement: (id: string, input: CashMovementInput) =>
    api.post<CashSession>(path(`${CASH}/sessions`, id, "movements"), input),
  close: (id: string, input: CloseSessionInput) => api.post<CashSession>(path(`${CASH}/sessions`, id, "close"), input),
}

const BANKS = "/finance/bank-accounts"
export const bankService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<BankAccount>>(BANKS, { query: toListQuery(params), signal }),
  create: (input: BankAccountInput) => api.post<BankAccount>(BANKS, input),
  update: (id: string, input: BankAccountInput) => api.put<BankAccount>(path(BANKS, id), input),
  movements: (accountId: string, params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<BankMovement>>(path(BANKS, accountId, "movements"), { query: toListQuery(params), signal }),
  addMovement: (accountId: string, input: BankMovementInput) =>
    api.post<BankMovement>(path(BANKS, accountId, "movements"), input),
  /** Opcional v1: marcar o desmarcar como conciliado */
  reconcile: (accountId: string, movementId: string, reconciled: boolean) =>
    api.patch<BankMovement>(`${path(BANKS, accountId, "movements")}/${encodeURIComponent(movementId)}`, { reconciled }),
}

export const statementService = {
  get: (query: StatementQuery, signal?: AbortSignal) =>
    api.get<Statement>("/finance/statements", { query: { ...query }, signal }),
}
