import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api/client"

/**
 * Altas, ediciones, cambios parciales y bajas de un recurso de Administración.
 * Al terminar refresca el listado y también Bitácora, Auditoría e integración,
 * porque la capa de integración registra cada cambio en ellos.
 */
export function createAdminMutations<T extends { id: string }, TInput>(resource: string) {
  const base = `/${resource}`

  function useRefresh() {
    const queryClient = useQueryClient()
    return () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["administration", resource] }),
        queryClient.invalidateQueries({ queryKey: ["administration", "logbook"] }),
        queryClient.invalidateQueries({ queryKey: ["administration", "integration"] }),
        queryClient.invalidateQueries({ queryKey: ["audit"] }),
      ])
  }

  return {
    useCreate() {
      const refresh = useRefresh()
      return useMutation({ mutationFn: (input: TInput) => api.post<T>(base, input), onSuccess: refresh })
    },
    useUpdate() {
      const refresh = useRefresh()
      return useMutation({
        mutationFn: ({ id, input }: { id: string; input: TInput }) =>
          api.put<T>(`${base}/${encodeURIComponent(id)}`, input),
        onSuccess: refresh,
      })
    },
    usePatch() {
      const refresh = useRefresh()
      return useMutation({
        mutationFn: ({ id, input }: { id: string; input: Partial<T> }) =>
          api.patch<T>(`${base}/${encodeURIComponent(id)}`, input),
        onSuccess: refresh,
      })
    },
    useRemove() {
      const refresh = useRefresh()
      return useMutation({
        mutationFn: (id: string) => api.delete(`${base}/${encodeURIComponent(id)}`),
        onSuccess: refresh,
      })
    },
    /** Acción propia del recurso, ej. POST /backups/:id/run */
    useAction(action: string) {
      const refresh = useRefresh()
      return useMutation({
        mutationFn: (id: string) => api.post<T>(`${base}/${encodeURIComponent(id)}/${action}`),
        onSuccess: refresh,
      })
    },
  }
}
