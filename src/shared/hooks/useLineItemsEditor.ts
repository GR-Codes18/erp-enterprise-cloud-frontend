import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldValues,
  type UseFormReturn,
  type UseFormSetValue,
} from "react-hook-form"
import type { EditableLine, LineErrors } from "@/shared/components/LineItemsEditor"
import { EMPTY_LINE, type DocumentLine } from "@/shared/lib/lines"

type LinesForm = { items: DocumentLine[] }

/**
 * Conecta el LineItemsEditor con un formulario de react-hook-form que tenga `items`.
 * Al elegir un producto se propone su precio (editable); la página decide cuál con `priceOf`.
 */
export function useLineItemsEditor<T extends FieldValues & LinesForm>(
  form: UseFormReturn<T>,
  priceOf: (productId: string) => string | undefined,
) {
  // Un solo lugar con conversiones de tipo: el formulario de la página tiene más campos que `items`
  const control = form.control as unknown as Control<LinesForm>
  const setValue = form.setValue as unknown as UseFormSetValue<LinesForm>
  const errors = form.formState.errors as FieldErrors<LinesForm>

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const values = useWatch({ control, name: "items" }) ?? []

  const lines: EditableLine[] = fields.map((field, index) => ({
    key: field.id,
    product_id: values[index]?.product_id ?? "",
    quantity: values[index]?.quantity ?? Number.NaN,
    unit_price: values[index]?.unit_price ?? "",
  }))

  const lineErrors: (LineErrors | undefined)[] = fields.map((_, index) => {
    const error = errors.items?.[index]
    return error
      ? {
          product_id: error.product_id?.message,
          quantity: error.quantity?.message,
          unit_price: error.unit_price?.message,
        }
      : undefined
  })

  const listError =
    errors.items?.message ?? (typeof errors.items?.root?.message === "string" ? errors.items.root.message : undefined)

  const validate = { shouldValidate: form.formState.isSubmitted, shouldDirty: true }

  return {
    lines,
    errors: lineErrors,
    listError,
    onProductChange: (index: number, productId: string) => {
      setValue(`items.${index}.product_id`, productId, validate)
      const proposed = priceOf(productId)
      if (proposed !== undefined) setValue(`items.${index}.unit_price`, proposed, validate)
    },
    onQuantityChange: (index: number, quantity: number) => setValue(`items.${index}.quantity`, quantity, validate),
    onPriceChange: (index: number, price: string) => setValue(`items.${index}.unit_price`, price, validate),
    onAdd: () => append({ ...EMPTY_LINE }),
    onRemove: (index: number) => remove(index),
  }
}
