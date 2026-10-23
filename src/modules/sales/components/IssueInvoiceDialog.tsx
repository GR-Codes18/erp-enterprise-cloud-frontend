import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { INVOICE_TYPES, INVOICE_TYPE_LABELS, canIssueAs, type InvoiceType } from "../invoices/schema"

interface IssueInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerDocumentType: string
  forceReceipt?: boolean
  isPending: boolean
  onConfirm: (type: InvoiceType) => void
}

/** Elegir factura o boleta. La factura exige cliente con RUC (el backend vuelve a validar) */
export function IssueInvoiceDialog({
  open,
  onOpenChange,
  customerDocumentType,
  forceReceipt = false,
  isPending,
  onConfirm,
}: IssueInvoiceDialogProps) {
  const [type, setType] = useState<InvoiceType>(forceReceipt || !canIssueAs("invoice", customerDocumentType) ? "receipt" : "invoice")
  const selectedType = forceReceipt ? "receipt" : type

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir comprobante</DialogTitle>
          <DialogDescription>
            {forceReceipt
              ? "Para una venta ocasional se emite boleta. Al emitirla se descuenta el stock."
              : "Al emitirlo se descuenta el stock y, si la orden de venta es a crédito, nace la cuenta por cobrar. El comprobante no se edita: un error se corrige anulándolo o con una devolución."}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Tipo de comprobante</legend>
          {INVOICE_TYPES.map((value) => {
            const allowed = canIssueAs(value, customerDocumentType) && (!forceReceipt || value === "receipt")
            return (
              <label key={value} className={`flex items-start gap-2 rounded-md border p-3 text-sm ${allowed ? "" : "opacity-60"}`}>
                <input
                  type="radio"
                  name="invoice-type"
                  className="mt-0.5 size-4 accent-primary"
                  value={value}
                  checked={selectedType === value}
                  disabled={!allowed || isPending}
                  onChange={() => setType(value)}
                />
                <span>
                  <span className="font-medium">{INVOICE_TYPE_LABELS[value]}</span>
                  {!allowed && (
                    <span className="block text-muted-foreground">
                      {forceReceipt ? "La venta ocasional se emite con boleta." : "Exige un cliente con RUC."}
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isPending} onClick={() => onConfirm(selectedType)}>
            {isPending ? "Emitiendo..." : `Emitir ${INVOICE_TYPE_LABELS[selectedType].toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
