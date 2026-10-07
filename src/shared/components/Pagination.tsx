import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

interface PaginationProps {
  page: number
  pages: number
  total: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({ page, pages, total, onPageChange, disabled = false }: PaginationProps) {
  if (total === 0) return null

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Página {page} de {pages} · {total} {total === 1 ? "registro" : "registros"}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}