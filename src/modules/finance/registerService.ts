import { api } from "@/shared/lib/api/client"
import type { Paginated } from "@/shared/lib/api/types"
import type { FinanceRegisterInput, FinanceRegisterKind, FinanceRegisterRecord } from "./registers"

const endpoint = (kind: FinanceRegisterKind) => `/finance/${kind}`

export const financeRegisterService = {
  list: (kind: FinanceRegisterKind, signal?: AbortSignal) =>
    api.get<Paginated<FinanceRegisterRecord>>(endpoint(kind), { query: { page: 1, size: 100 }, signal }),
  create: (kind: FinanceRegisterKind, input: FinanceRegisterInput) =>
    api.post<FinanceRegisterRecord>(endpoint(kind), input),
  updateStatus: (kind: FinanceRegisterKind, id: string, status: string) =>
    api.patch<FinanceRegisterRecord>(`${endpoint(kind)}/${encodeURIComponent(id)}/status`, { status }),
}
