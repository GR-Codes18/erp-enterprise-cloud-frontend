import { createAdminMutations } from "../shared/adminCrud"
import { createReadOnlyListHook } from "../shared/readOnlyList"
import type { ConnectionRecord } from "./mock"
import type { ConnectionInput } from "./schema"

export const useConnections = createReadOnlyListHook<ConnectionRecord>("connections")

const mutations = createAdminMutations<ConnectionRecord, ConnectionInput>("connections")
export const useCreateConnection = mutations.useCreate
export const useUpdateConnection = mutations.useUpdate
export const usePatchConnection = mutations.usePatch
export const useRemoveConnection = mutations.useRemove
