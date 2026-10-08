import { useState } from "react"
import { Download, Eye, Plus, Trash2 } from "lucide-react"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import ReasonDialog from "@/shared/components/ReasonDialog"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import type { PageParams } from "@/shared/lib/api/types"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { DocumentDetailDialog } from "../files/components/DocumentDetailDialog"
import { UploadDocumentDialog } from "../files/components/UploadDocumentDialog"
import { formatFileSize } from "../files/fileRules"
import { useDocuments, useDownloadDocument, useVoidDocument } from "../files/hooks"
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  ENTITY_LABELS,
  ENTITY_TYPES,
  FILTER_ALL,
  buildDocumentFilters,
  isValidDateRange,
  type DocumentRecord,
} from "../files/schema"

const PAGE_SIZE = 10

export default function FilesPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [category, setCategory] = useState(FILTER_ALL)
  const [entityType, setEntityType] = useState(FILTER_ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [uploadOpen, setUploadOpen] = useState(false)
  // detail se conserva al cerrar para que el contenido no cambie durante la animación
  const [detail, setDetail] = useState<{ open: boolean; document: DocumentRecord | null }>({
    open: false,
    document: null,
  })
  const [toDelete, setToDelete] = useState<DocumentRecord | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Un rango invertido no se envía (el backend respondería 422): se avisa junto al campo
  const rangeValid = isValidDateRange(dateFrom, dateTo)
  const filters = buildDocumentFilters({ category, entity_type: entityType })
  const params: PageParams = {
    page,
    size: PAGE_SIZE,
    search,
    filters,
    ...(rangeValid && dateFrom ? { date_from: dateFrom } : {}),
    ...(rangeValid && dateTo ? { date_to: dateTo } : {}),
  }

  const documents = useDocuments(params)
  const voidDocument = useVoidDocument()
  const downloadDocument = useDownloadDocument()

  const hasFilters = search !== "" || Object.keys(filters).length > 0 || dateFrom !== "" || dateTo !== ""

  // Cada cambio de filtro vuelve a la página 1
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput("")
    setCategory(FILTER_ALL)
    setEntityType(FILTER_ALL)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const handleDownload = (document: DocumentRecord) => {
    setActionError(null)
    setDownloadingId(document.id)
    downloadDocument.mutate(
      { id: document.id, name: document.name },
      {
        onError: (error) => setActionError(getErrorMessage(error)),
        onSettled: () => setDownloadingId(null),
      },
    )
  }

  const handleConfirmDelete = (reason: string) => {
    if (!toDelete) return
    setActionError(null)
    voidDocument.mutate(
      { id: toDelete.id, reason },
      {
        onSuccess: () => {
          // Si se eliminó el último de la página, se retrocede una
          if ((documents.data?.items.length ?? 0) === 1 && page > 1) setPage(page - 1)
          setToDelete(null)
        },
        onError: (error) => {
          setToDelete(null)
          setActionError(getErrorMessage(error))
        },
      },
    )
  }

  const columns: Column<DocumentRecord>[] = [
    {
      key: "name",
      header: "Archivo",
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(row.size)}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoría",
      cell: (row) => <StatusBadge tone="neutral" label={CATEGORY_LABELS[row.category]} />,
    },
    {
      key: "entity",
      header: "Relacionado con",
      cell: (row) =>
        row.entity_type
          ? `${ENTITY_LABELS[row.entity_type]}${row.entity_label ? ` · ${row.entity_label}` : ""}`
          : "—",
    },
    { key: "uploaded_by", header: "Subido por", cell: (row) => row.uploaded_by_name },
    {
      key: "uploaded_at",
      header: "Fecha y hora",
      cell: (row) => formatDateTimeLima(row.uploaded_at),
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-36",
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ver detalle de ${row.name}`}
            onClick={() => setDetail({ open: true, document: row })}
          >
            <Eye aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Descargar ${row.name}`}
            disabled={downloadingId === row.id}
            onClick={() => handleDownload(row)}
          >
            <Download aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Eliminar ${row.name}`}
            onClick={() => setToDelete(row)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  const uploadButton = (
    <Button onClick={() => setUploadOpen(true)}>
      <Plus aria-hidden="true" />
      Subir documento
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Archivos"
        description="Repositorio de documentos de la empresa."
        actions={uploadButton}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Input
            type="search"
            placeholder="Buscar por nombre"
            aria-label="Buscar documentos"
            value={searchInput}
            onChange={(event) => withReset(setSearchInput)(event.target.value)}
          />
        </div>

        <Select value={category} onValueChange={withReset(setCategory)}>
          <SelectTrigger className="w-48" aria-label="Filtrar por categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todas las categorías</SelectItem>
            {DOCUMENT_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityType} onValueChange={withReset(setEntityType)}>
          <SelectTrigger className="w-52" aria-label="Filtrar por registro relacionado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Cualquier registro</SelectItem>
            {ENTITY_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {ENTITY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Field id="date_from" label="Desde">
          <Input
            id="date_from"
            type="date"
            className="w-40"
            value={dateFrom}
            onChange={(event) => withReset(setDateFrom)(event.target.value)}
          />
        </Field>
        <Field
          id="date_to"
          label="Hasta"
          error={rangeValid ? undefined : "La fecha final no puede ser anterior a la inicial"}
        >
          <Input
            id="date_to"
            type="date"
            className="w-40"
            aria-invalid={!rangeValid}
            aria-describedby={rangeValid ? undefined : "date_to-error"}
            value={dateTo}
            onChange={(event) => withReset(setDateTo)(event.target.value)}
          />
        </Field>

        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {actionError}
        </p>
      )}

      {documents.isError ? (
        <ErrorState
          message={getErrorMessage(documents.error)}
          onRetry={() => void documents.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={documents.data?.items ?? []}
            getRowKey={(row) => row.id}
            isLoading={documents.isPending}
            empty={
              hasFilters ? (
                <EmptyState
                  title="Sin resultados"
                  description="Ningún documento coincide con tu búsqueda o filtros."
                />
              ) : (
                <EmptyState
                  title="Aún no hay documentos"
                  description="Sube el primero para empezar."
                  action={uploadButton}
                />
              )
            }
          />
          <Pagination
            page={documents.data?.page ?? 1}
            pages={documents.data?.pages ?? 1}
            total={documents.data?.total ?? 0}
            disabled={documents.isFetching}
            onPageChange={setPage}
          />
        </>
      )}

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <DocumentDetailDialog
        open={detail.open}
        document={detail.document}
        onOpenChange={(open) => setDetail((current) => ({ ...current, open }))}
        onDownload={handleDownload}
        isDownloading={downloadingId !== null && downloadingId === detail.document?.id}
      />

      <ReasonDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Eliminar documento"
        description={`El documento "${toDelete?.name ?? ""}" dejará de estar disponible. Indica el motivo para dejar constancia.`}
        confirmLabel="Eliminar"
        isPending={voidDocument.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}