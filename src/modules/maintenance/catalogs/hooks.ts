import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PageParams } from "@/shared/lib/api/types"
import { masterCatalogService } from "./service"
import type { MasterCatalogInput, MasterCatalogResource } from "./schema"

export const masterCatalogKeys = {
  all: ["maintenance-catalogs"] as const,
  list: (resource: MasterCatalogResource, params: PageParams) =>
    [...masterCatalogKeys.all, resource, params] as const,
  options: (resource: MasterCatalogResource, search: string) =>
    [...masterCatalogKeys.all, resource, "options", search] as const,
}

export function useMasterCatalog(resource: MasterCatalogResource, params: PageParams) {
  return useQuery({
    queryKey: masterCatalogKeys.list(resource, params),
    queryFn: ({ signal }) => masterCatalogService.list(resource, params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useMasterCatalogOptions(resource: MasterCatalogResource, search = "") {
  const params: PageParams = {
    page: 1,
    size: 100,
    search: search.trim() || undefined,
    filters: { status: "active" },
  }
  return useQuery({
    queryKey: masterCatalogKeys.options(resource, params.search ?? ""),
    queryFn: ({ signal }) => masterCatalogService.list(resource, params, signal),
    select: (data) => data.items,
  })
}

function useInvalidateMasterCatalog() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: masterCatalogKeys.all })
}

export function useCreateMasterCatalog() {
  const invalidate = useInvalidateMasterCatalog()
  return useMutation({
    mutationFn: ({ resource, input }: { resource: MasterCatalogResource; input: MasterCatalogInput }) =>
      masterCatalogService.create(resource, input),
    onSuccess: invalidate,
  })
}

export function useUpdateMasterCatalog() {
  const invalidate = useInvalidateMasterCatalog()
  return useMutation({
    mutationFn: ({ resource, id, input }: { resource: MasterCatalogResource; id: string; input: MasterCatalogInput }) =>
      masterCatalogService.update(resource, id, input),
    onSuccess: invalidate,
  })
}

export function usePatchMasterCatalog() {
  const invalidate = useInvalidateMasterCatalog()
  return useMutation({
    mutationFn: ({ resource, id, input }: { resource: MasterCatalogResource; id: string; input: Partial<MasterCatalogInput> }) =>
      masterCatalogService.patch(resource, id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteMasterCatalog() {
  const invalidate = useInvalidateMasterCatalog()
  return useMutation({
    mutationFn: ({ resource, id }: { resource: MasterCatalogResource; id: string }) =>
      masterCatalogService.remove(resource, id),
    onSuccess: invalidate,
  })
}
