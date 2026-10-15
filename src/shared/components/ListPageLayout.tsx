import type { ReactNode } from "react"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { Button } from "@/shared/components/ui/button"
import { getErrorMessage } from "@/shared/lib/api/errors"
import type { Paginated } from "@/shared/lib/api/types"

interface ListQuery<T> {
  data?: Paginated<T>
  isPending: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

interface ListPageLayoutProps<T> {
  title: string
  description: string
  actions?: ReactNode
  /** Búsqueda y filtros; el botón "Limpiar filtros" lo agrega el layout */
  toolbar: ReactNode
  hasFilters: boolean
  onClearFilters: () => void
  query: ListQuery<T>
  columns: Column<T>[]
  getRowKey: (row: T) => string
  empty: { title: string; description: string; action?: ReactNode }
  onPageChange: (page: number) => void
}

/** Listado de solo lectura o de documentos: filtros arriba, DataTable y Pagination (receta 4.3) */
export function ListPageLayout<T>({
  title,
  description,
  actions,
  toolbar,
  hasFilters,
  onClearFilters,
  query,
  columns,
  getRowKey,
  empty,
  onPageChange,
}: ListPageLayoutProps<T>) {
  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />

      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5" aria-label={`Listado: ${title}`}>
        <div className="flex flex-wrap items-end gap-3">
          {toolbar}
          {hasFilters && (
            <Button variant="outline" onClick={onClearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={query.data?.items ?? []}
              getRowKey={getRowKey}
              isLoading={query.isPending}
              empty={
                hasFilters ? (
                  <EmptyState title="Sin resultados" description="Nada coincide con la búsqueda o los filtros." />
                ) : (
                  <EmptyState title={empty.title} description={empty.description} action={empty.action} />
                )
              }
            />
            <Pagination
              page={query.data?.page ?? 1}
              pages={query.data?.pages ?? 1}
              total={query.data?.total ?? 0}
              disabled={query.isFetching}
              onPageChange={onPageChange}
            />
          </>
        )}
      </section>
    </>
  )
}
