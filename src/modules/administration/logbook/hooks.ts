import { createReadOnlyListHook } from "../shared/readOnlyList"
import type { LogbookEntry } from "./mock"

export const useLogbookEntries = createReadOnlyListHook<LogbookEntry>("logbook")
