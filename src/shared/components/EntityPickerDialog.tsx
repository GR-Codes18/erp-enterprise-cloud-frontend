import { useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import type { FilterOption } from "./FilterSelect"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { cn } from "cn"

export interface EntityPickerDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  options: FilterOption[]
  value: string
  onSelect?: (value: string) => void
  onValueChange?: (value: string) => void
  onSearchChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  disabled?: boolean
  isLoading?: boolean
  errorMessage?: string
  allOption?: FilterOption
  className?: string
  triggerClassName?: string
  /** Max options shown when no search (default: all) */
  limit?: number
  "aria-label"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function EntityPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  value,
  onSelect,
  onValueChange,
  onSearchChange,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar...",
  emptyLabel = "No se encontraron resultados.",
  disabled,
  isLoading = false,
  errorMessage,
  allOption,
  className,
  triggerClassName,
  limit,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: EntityPickerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState("")

  const isControlled = open !== undefined
  const resolvedOpen = isControlled ? !!open : internalOpen
  const resolvedOnOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
    if (!next) setSearch("")
  }

  const handleSelect = (optionValue: string) => {
    ;(onValueChange ?? onSelect)?.(optionValue)
    resolvedOnOpenChange(false)
  }

  const selectedOption =
    value === allOption?.value
      ? allOption
      : options.find((option) => option.value === value)

  const normalizedSearch = search.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase()
  const filteredOptions = options.filter((option) =>
    option.label.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().includes(normalizedSearch),
  )
  let visibleOptions = filteredOptions
  if (limit !== undefined && normalizedSearch === "") {
    const head = filteredOptions.slice(0, limit)
    const selected = filteredOptions.find((option) => option.value === value)
    if (selected && !head.some((option) => option.value === selected.value)) {
      visibleOptions = [selected, ...head.slice(0, Math.max(0, limit - 1))]
    } else {
      visibleOptions = head
    }
  }

  const dialogTitle = title ?? placeholder

  return (
    <div className={cn("w-full", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={resolvedOpen}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        className={cn("w-full justify-between font-normal", triggerClassName)}
        onClick={() => !disabled && resolvedOnOpenChange(true)}
      >
        <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronsUpDown aria-hidden="true" className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>
      <Dialog open={resolvedOpen} onOpenChange={resolvedOnOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                type="search"
                value={search}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                onChange={(event) => {
                  setSearch(event.target.value)
                  onSearchChange?.(event.target.value)
                }}
                className="pl-8"
              />
            </div>
            <div role="listbox" aria-label={dialogTitle} className="max-h-72 overflow-y-auto rounded-md border">
              {allOption && (
                <button
                  type="button"
                  role="option"
                  aria-selected={value === allOption.value}
                  className="flex min-h-9 w-full items-center justify-between px-3 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelect(allOption.value)}
                >
                  <span>{allOption.label}</span>
                  {value === allOption.value && <Check aria-hidden="true" className="size-4" />}
                </button>
              )}
              {isLoading && (
                <p role="status" className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Cargando…
                </p>
              )}
              {errorMessage && (
                <p role="alert" className="px-3 py-4 text-sm text-danger-text">
                  {errorMessage}
                </p>
              )}
              {!isLoading && !errorMessage && visibleOptions.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>
              )}
              {!isLoading &&
                !errorMessage &&
                visibleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    className="flex min-h-9 w-full items-center justify-between px-3 text-left text-sm hover:bg-accent"
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="truncate">{option.label}</span>
                    {value === option.value && <Check aria-hidden="true" className="size-4 shrink-0" />}
                  </button>
                ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => resolvedOnOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
