import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Link, useParams } from "react-router"
import { useHasPermission } from "@/modules/auth"
import { DetailGrid } from "@/shared/components/DetailGrid"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { Pagination } from "@/shared/components/Pagination"
import { StatusBadge } from "@/shared/components/StatusBadge"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Textarea } from "@/shared/components/ui/textarea"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatDateTimeLima } from "@/shared/lib/dates"
import { formatCents, formatMoney } from "@/shared/lib/money"
import {
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_TYPE_LABELS,
  CASH_SESSION_STATUS_LABELS,
  CASH_SESSION_STATUS_TONES,
  cashDifferenceCents,
  cashMovementInputSchema,
  closeSessionSchema,
  describeDifference,
  differenceText,
  canTransitionCashSession,
  type CashMovementInput,
  type CashSession,
  type CloseSessionInput,
} from "../cash/schema"
import { useAddCashMovement, useCashSession, useCloseCashSession } from "../hooks"

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/
const MOVEMENTS_PAGE_SIZE = 10

function MovementDialog({ session, open, onClose }: { session: CashSession; open: boolean; onClose: () => void }) {
  const add = useAddCashMovement()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CashMovementInput>({
    resolver: zodResolver(cashMovementInputSchema),
    defaultValues: { type: "income", concept: "", amount: "" },
  })
  const type = useWatch({ control, name: "type" })
  const close = () => {
    reset()
    setServerError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>Ingresos y egresos manuales de efectivo. El concepto es obligatorio.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit((values) => {
            setServerError(null)
            add.mutate({ id: session.id, input: values }, { onSuccess: close, onError: (error) => setServerError(getErrorMessage(error)) })
          })}
        >
          <Field id="movement-type" label="Tipo">
            <Select value={type} onValueChange={(value) => setValue("type", value as CashMovementInput["type"])} disabled={add.isPending}>
              <SelectTrigger id="movement-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASH_MOVEMENT_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CASH_MOVEMENT_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="concept" label="Concepto" error={errors.concept?.message}>
            <Input
              id="concept"
              disabled={add.isPending}
              aria-invalid={!!errors.concept}
              aria-describedby={errors.concept ? "concept-error" : undefined}
              {...register("concept")}
            />
          </Field>
          <Field id="movement-amount" label="Monto (S/)" error={errors.amount?.message}>
            <Input
              id="movement-amount"
              inputMode="decimal"
              placeholder="0.00"
              disabled={add.isPending}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "movement-amount-error" : undefined}
              {...register("amount")}
            />
          </Field>
          {serverError && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
              {serverError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={add.isPending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CloseDialog({ session, open, onClose }: { session: CashSession; open: boolean; onClose: () => void }) {
  const closeSession = useCloseCashSession()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CloseSessionInput>({
    resolver: zodResolver(closeSessionSchema(session.expected_amount)),
    defaultValues: { counted_amount: "", note: "" },
  })
  const counted = useWatch({ control, name: "counted_amount" }).trim()
  // Vista previa de la diferencia contra lo esperado (la oficial la calcula el backend)
  const difference = AMOUNT_PATTERN.test(counted) ? cashDifferenceCents(session.expected_amount, counted) : null
  const described = difference === null ? null : describeDifference(difference)

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>Cuenta el efectivo e ingrésalo. Después del cierre la sesión es solo lectura.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit((values) => {
            setServerError(null)
            closeSession.mutate({ id: session.id, input: values }, { onSuccess: onClose, onError: (error) => setServerError(getErrorMessage(error)) })
          })}
        >
          <p className="text-sm">
            Efectivo esperado: <span className="font-mono font-medium">{formatMoney(session.expected_amount)}</span>
          </p>
          <Field id="counted_amount" label="Efectivo contado (S/)" error={errors.counted_amount?.message}>
            <Input
              id="counted_amount"
              inputMode="decimal"
              placeholder="0.00"
              disabled={closeSession.isPending}
              aria-invalid={!!errors.counted_amount}
              aria-describedby={errors.counted_amount ? "counted_amount-error" : "difference-preview"}
              {...register("counted_amount")}
            />
          </Field>
          {described && difference !== null && (
            <p id="difference-preview" role="status" className="flex items-center gap-2 text-sm">
              Diferencia: <StatusBadge tone={described.tone} label={differenceText(difference, formatCents)} />
            </p>
          )}
          <Field id="note" label="Nota (obligatoria si hay diferencia)" error={errors.note?.message}>
            <Textarea
              id="note"
              maxLength={300}
              disabled={closeSession.isPending}
              aria-invalid={!!errors.note}
              aria-describedby={errors.note ? "note-error" : undefined}
              {...register("note")}
            />
          </Field>
          {serverError && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
              {serverError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={closeSession.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={closeSession.isPending}>
              {closeSession.isPending ? "Cerrando..." : "Cerrar caja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CashSessionPage() {
  const { id = "" } = useParams()
  const session = useCashSession(id)
  const canEdit = useHasPermission("finance.cash:edit")
  const canCreate = useHasPermission("finance.cash:create")
  const [dialog, setDialog] = useState<"movement" | "close" | null>(null)
  const [movementsPage, setMovementsPage] = useState(1)

  if (session.isPending) return <p role="status">Cargando sesión…</p>
  if (session.isError) return <ErrorState message={getErrorMessage(session.error)} onRetry={() => void session.refetch()} />

  const current = session.data
  // Movimientos y cierre solo mientras la sesión pueda cerrarse; cerrada es solo lectura
  const isOpen = canTransitionCashSession(current.status, "closed")
  const differenceCents = isOpen ? null : cashDifferenceCents(current.expected_amount, current.counted_amount)
  const difference = differenceCents === null ? null : describeDifference(differenceCents)
  const movements = current.movements.slice((movementsPage - 1) * MOVEMENTS_PAGE_SIZE, movementsPage * MOVEMENTS_PAGE_SIZE)
  const movementPages = Math.max(1, Math.ceil(current.movements.length / MOVEMENTS_PAGE_SIZE))

  const actions = (
    <>
      {canCreate && isOpen && <Button onClick={() => setDialog("movement")}>Registrar movimiento</Button>}
      {canEdit && isOpen && (
        <Button variant="outline" onClick={() => setDialog("close")}>
          Cerrar caja
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/finance/cash">Volver a caja</Link>
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={`${current.register_name} · ${current.number}`} description={`Abierta ${formatDateTimeLima(current.opened_at)} por ${current.opened_by_name}`} actions={actions} />

      <DetailGrid
        items={[
          { label: "Estado", value: <StatusBadge tone={CASH_SESSION_STATUS_TONES[current.status]} label={CASH_SESSION_STATUS_LABELS[current.status]} /> },
          { label: "Monto inicial", value: formatMoney(current.opening_amount) },
          { label: "Efectivo esperado", value: formatMoney(current.expected_amount) },
          {
            label: isOpen ? "Cierre" : "Contado al cierre",
            value: isOpen ? "Pendiente" : formatMoney(current.counted_amount),
          },
        ]}
      />

      {difference && (
        <div className="mb-6 space-y-1 rounded-md border px-3 py-2 text-sm">
          <p className="flex items-center gap-2">
            Diferencia: <StatusBadge tone={difference.tone} label={differenceText(differenceCents ?? 0, formatCents)} />
          </p>
          {current.closing_note && <p className="text-muted-foreground">Nota: {current.closing_note}</p>}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-medium">Movimientos</h2>
        {current.movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay movimientos en esta sesión.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDateTimeLima(movement.created_at)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={movement.type === "income" ? "success" : "warning"} label={CASH_MOVEMENT_TYPE_LABELS[movement.type]} />
                    </TableCell>
                    <TableCell>{movement.concept}</TableCell>
                    <TableCell>{movement.source === "payment" ? "Cobro o pago" : "Manual"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {movement.type === "expense" ? "−" : ""}
                      {formatMoney(movement.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {movementPages > 1 && (
          <Pagination page={movementsPage} pages={movementPages} total={current.movements.length} onPageChange={setMovementsPage} />
        )}
      </section>

      {isOpen && (
        <>
          <MovementDialog session={current} open={dialog === "movement"} onClose={() => setDialog(null)} />
          <CloseDialog key={current.expected_amount} session={current} open={dialog === "close"} onClose={() => setDialog(null)} />
        </>
      )}
    </>
  )
}
