import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { settingsService } from "./service"
import type { SettingsInput } from "./schema"

export const settingsKeys = {
  all: ["settings"] as const,
  current: () => [...settingsKeys.all, "current"] as const,
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.current(),
    queryFn: ({ signal }) => settingsService.get(signal),
  })
}

/** Tras guardar se vuelve a leer la configuración vigente. */
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SettingsInput }) =>
      settingsService.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  })
}