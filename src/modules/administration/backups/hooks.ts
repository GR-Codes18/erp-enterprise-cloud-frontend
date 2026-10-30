import { createAdminMutations } from "../shared/adminCrud"
import { createReadOnlyListHook } from "../shared/readOnlyList"
import type { BackupRecord } from "./mock"
import type { BackupInput } from "./schema"

export const useBackups = createReadOnlyListHook<BackupRecord>("backups")

const mutations = createAdminMutations<BackupRecord, BackupInput>("backups")
export const useCreateBackup = mutations.useCreate
export const useUpdateBackup = mutations.useUpdate
export const useRemoveBackup = mutations.useRemove
export const useRunBackup = () => mutations.useAction("run")
