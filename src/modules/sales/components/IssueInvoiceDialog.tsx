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
  isPending: boolean
  onConfirm: (type: InvoiceType) => void
}

/** Elegir factura o boleta. La factura exige cliente con RUC (el backend vuelve a validar) */
export function IssueInvoiceDialog({ open, onOpenChange, customerDocumentType, isPending, onConfirm }: IssueInvoiceDialogProps) {
  const [type, setType] = useState<InvoiceType>(canIssueAs("invoice", customerDocumentType) ? "invoice" : "receipt")

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir comprobante</DialogTitle>
          <DialogDescription>
            Al emitirlo se descuenta el stock y, si el pedido es a crédito, nace la cuenta por cobrar. El comprobante
            no se edita: un error se corrige anulándolo o con una devolución.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Tipo de comprobante</legend>
          {INVOICE_TYPES.map((value) => {
            const allowed = canIssueAs(value, customerDocumentType)
            return (
              <label key={value} className={`flex items-start gap-2 rounded-md border p-3 text-sm ${allowed ? "" : "opacity-60"}`}>
                <input
                  type="radio"
                  name="invoice-type"
                  className="mt-0.5 size-4 accent-primary"
                  value={value}
                  checked={type === value}
                  disabled={!allowed || isPending}
                  onChange={() => setType(value)}
                />
                <span>
                  <span className="font-medium">{INVOICE_TYPE_LABELS[value]}</span>
                  {!allowed && <span className="block text-muted-foreground">Exige un cliente con RUC.</span>}
                </span>
              </label>
            )
          })}
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isPending} onClick={() => onConfirm(type)}>
            {isPending ? "Emitiendo..." : `Emitir ${INVOICE_TYPE_LABELS[type].toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
