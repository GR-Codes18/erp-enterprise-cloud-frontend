import { useState } from "react"
import { Printer } from "lucide-react"
import { useCustomerOptions, useSupplierOptions } from "@/modules/maintenance"
import { ErrorState } from "@/shared/components/ErrorState"
import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { SearchableSelect } from "@/shared/components/SearchableSelect"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { formatBusinessDate, todayInLima } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { useStatement } from "../hooks"
import {
  PARTY_TYPES,
  PARTY_TYPE_LABELS,
  STATEMENT_LINE_LABELS,
  statementQuerySchema,
  type PartyType,
  type StatementQuery,
} from "../statements/schema"

export default function StatementsPage() {
  const today = todayInLima()
  const [partyType, setPartyType] = useState<PartyType>("customer")
  const [partyId, setPartyId] = useState("")
  const [partySearchInput, setPartySearchInput] = useState("")
  const partySearch = useDebouncedValue(partySearchInput.trim(), 300)
  const [dateFrom, setDateFrom] = useState(`${today.slice(0, 8)}01`)
  const [dateTo, setDateTo] = useState(today)
  const [errors, setErrors] = useState<Partial<Record<keyof StatementQuery, string>>>({})
  // La consulta solo se hace al pulsar "Consultar" con datos completos
  const [query, setQuery] = useState<StatementQuery | null>(null)
  const statement = useStatement(query)

  // Consulta histórica: también terceros inactivos
  const customers = useCustomerOptions({
    includeInactive: true,
    search: partyType === "customer" ? partySearch : "",
  })
  const suppliers = useSupplierOptions({
    includeInactive: true,
    search: partyType === "supplier" ? partySearch : "",
  })
  const parties = (partyType === "customer" ? customers.data : suppliers.data) ?? []
  const partiesQuery = partyType === "customer" ? customers : suppliers

  const consult = () => {
    const parsed = statementQuerySchema.safeParse({ party_type: partyType, party_id: partyId, date_from: dateFrom, date_to: dateTo })
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])))
      return
    }
    setErrors({})
    setQuery(parsed.data)
  }

  return (
    <>
      <PageHeader
        title="Estado de cuenta"
        description="Comprobantes, pagos y saldo acumulado de un cliente o proveedor en un rango de fechas."
        actions={
          statement.data && (
            <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              Imprimir
            </Button>
          )
        }
      />

      <form
        noValidate
        className="mb-6 flex flex-wrap items-end gap-3 print:hidden"
        onSubmit={(event) => {
          event.preventDefault()
          consult()
        }}
      >
        <Field id="party_type" label="Tipo">
          <Select
            value={partyType}
            onValueChange={(value) => {
              setPartyType(value as PartyType)
              setPartyId("")
              setPartySearchInput("")
            }}
          >
            <SelectTrigger id="party_type" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARTY_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {PARTY_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="party_id" label={PARTY_TYPE_LABELS[partyType]} error={errors.party_id}>
          <SearchableSelect
            value={partyId}
            onValueChange={setPartyId}
            onSearchChange={setPartySearchInput}
            options={parties.map((party) => ({
              value: party.id,
              label: `${party.name} · ${party.document_number}`,
            }))}
            placeholder="Selecciona a quién"
            searchPlaceholder="Buscar por nombre o documento"
            disabled={partiesQuery.isPending}
            isLoading={partiesQuery.isFetching}
            errorMessage={partiesQuery.isError ? getErrorMessage(partiesQuery.error) : undefined}
            aria-invalid={!!errors.party_id}
            aria-describedby={errors.party_id ? "party_id-error" : undefined}
            aria-label={PARTY_TYPE_LABELS[partyType]}
            className="w-72"
          />
        </Field>
        <Field id="statement_from" label="Desde" error={errors.date_from}>
          <Input id="statement_from" type="date" className="w-40" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </Field>
        <Field id="statement_to" label="Hasta" error={errors.date_to}>
          <Input
            id="statement_to"
            type="date"
            className="w-40"
            aria-invalid={!!errors.date_to}
            aria-describedby={errors.date_to ? "statement_to-error" : undefined}
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </Field>
        <Button type="submit">Consultar</Button>
      </form>

      {!query ? (
        <p className="text-sm text-muted-foreground">Elige a quién y el rango de fechas, y pulsa Consultar.</p>
      ) : statement.isError ? (
        <ErrorState message={getErrorMessage(statement.error)} onRetry={() => void statement.refetch()} />
      ) : statement.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Generando estado de cuenta…
        </p>
      ) : (
        <section aria-labelledby="statement-title" className="space-y-4">
          <div>
            <h2 id="statement-title" className="text-lg font-semibold">
              {statement.data.party_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {statement.data.party_document} · del {formatBusinessDate(statement.data.date_from)} al{" "}
              {formatBusinessDate(statement.data.date_to)}
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-right">Cargo</TableHead>
                  <TableHead className="text-right">Abono</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="font-medium">
                    Saldo inicial
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(statement.data.opening_balance)}</TableCell>
                </TableRow>
                {statement.data.lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      Sin movimientos en el rango.
                    </TableCell>
                  </TableRow>
                )}
                {statement.data.lines.map((line, index) => (
                  <TableRow key={`${line.document_code}-${index}`}>
                    <TableCell>{formatBusinessDate(line.date)}</TableCell>
                    <TableCell>{STATEMENT_LINE_LABELS[line.type]}</TableCell>
                    <TableCell className="font-mono text-sm">{line.document_code}</TableCell>
                    <TableCell className="text-right font-mono">{line.debit === "0.00" ? "" : formatMoney(line.debit)}</TableCell>
                    <TableCell className="text-right font-mono">{line.credit === "0.00" ? "" : formatMoney(line.credit)}</TableCell>
                    {/* El saldo acumulado viene del backend: el frontend no suma */}
                    <TableCell className="text-right font-mono">{formatMoney(line.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="font-semibold">
                    Saldo final
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatMoney(statement.data.closing_balance)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </>
  )
}
