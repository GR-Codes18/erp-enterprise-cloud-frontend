import { createAdminMutations } from "../shared/adminCrud"
import { createReadOnlyListHook } from "../shared/readOnlyList"
import type { DocumentSeries } from "./mock"
import type { SeriesInput } from "./schema"

export const useDocumentSeries = createReadOnlyListHook<DocumentSeries>("series")

const mutations = createAdminMutations<DocumentSeries, SeriesInput>("series")
export const useCreateSeries = mutations.useCreate
export const useUpdateSeries = mutations.useUpdate
export const usePatchSeries = mutations.usePatch
export const useRemoveSeries = mutations.useRemove
