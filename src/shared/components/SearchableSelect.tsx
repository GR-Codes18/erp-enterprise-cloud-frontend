import { useState } from "react"
import { Popover } from "radix-ui"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { cn } from "cn"
import type { FilterOption } from "./FilterSelect"

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: FilterOption[]
  placeholder: string
  searchPlaceholder: string
  emptyLabel?: string
  disabled?: boolean
  isLoading?: boolean
  errorMessage?: string
  className?: string
  allOption?: FilterOption
  onSearchChange?: (value: string) => void
  "aria-label"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel = "No se encontraron resultados.",
  disabled,
  isLoading = false,
  errorMessage,
  className,
  allOption,
  onSearchChange,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [lastSelectedOption, setLastSelectedOption] = useState<FilterOption | null>(null)
  const normalizedSearch = search.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase()
  const visibleOptions = options.filter((option) =>
    option.label
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  )
  const selectedOption =
    value === allOption?.value
      ? allOption
      : options.find((option) => option.value === value) ??
        (lastSelectedOption?.value === value ? lastSelectedOption : undefined)

  const changeSearch = (nextSearch: string) => {
    setSearch(nextSearch)
    onSearchChange?.(nextSearch)
  }

  const selectOption = (option: FilterOption) => {
    setLastSelectedOption(option)
    onValueChange(option.value)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronsUpDown aria-hidden="true" className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Input
            autoFocus
            type="search"
            value={search}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            onChange={(event) => changeSearch(event.target.value)}
            className="mb-2"
          />
          <div role="listbox" aria-label={ariaLabel} className="max-h-60 overflow-y-auto">
            {allOption && (
              <button
                type="button"
                role="option"
                aria-selected={value === allOption.value}
                className="flex min-h-9 w-full items-center justify-between rounded-md px-2 text-left text-sm hover:bg-accent"
                onClick={() => selectOption(allOption)}
              >
                <span>{allOption.label}</span>
                {value === allOption.value && <Check aria-hidden="true" className="size-4" />}
              </button>
            )}
            {!errorMessage && visibleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                className="flex min-h-9 w-full items-center justify-between rounded-md px-2 text-left text-sm hover:bg-accent"
                onClick={() => selectOption(option)}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && <Check aria-hidden="true" className="size-4 shrink-0" />}
              </button>
            ))}
            {isLoading && (
              <p role="status" className="px-2 py-3 text-center text-sm text-muted-foreground">
                Buscando…
              </p>
            )}
            {errorMessage && (
              <p role="alert" className="px-2 py-3 text-sm text-danger-text">
                {errorMessage}
              </p>
            )}
            {!isLoading && !errorMessage && visibleOptions.length === 0 && (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">{emptyLabel}</p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
