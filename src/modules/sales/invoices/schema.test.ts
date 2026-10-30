import { describe, expect, it } from "vitest"
import {
  INVOICE_STATUSES,
  INVOICE_TRANSITIONS,
  canIssueAs,
  canTransitionInvoice,
  canVoidInvoice,
  invoiceCode,
  issueInvoiceSchema,
} from "./schema"

describe("canIssueAs", () => {
  it("la factura exige cliente con RUC", () => {
    expect(canIssueAs("invoice", "RUC")).toBe(true)
    expect(canIssueAs("invoice", "DNI")).toBe(false)
    expect(canIssueAs("invoice", "CE")).toBe(false)
  })

  it("la boleta se emite a cualquier cliente", () => {
    for (const documentType of ["RUC", "DNI", "CE"]) expect(canIssueAs("receipt", documentType)).toBe(true)
  })
})

describe("issueInvoiceSchema", () => {
  it("solo acepta factura o boleta", () => {
    expect(issueInvoiceSchema.safeParse({ type: "invoice" }).success).toBe(true)
    expect(issueInvoiceSchema.safeParse({ type: "credit_note" }).success).toBe(false)
  })
})

describe("INVOICE_TRANSITIONS", () => {
  it("los cobros avanzan el estado y nunca retroceden", () => {
    expect(canTransitionInvoice("issued", "partially_paid")).toBe(true)
    expect(canTransitionInvoice("partially_paid", "paid")).toBe(true)
    expect(canTransitionInvoice("paid", "issued")).toBe(false)
  })

  it("solo se anula un comprobante emitido", () => {
    expect(canTransitionInvoice("issued", "void")).toBe(true)
    expect(canTransitionInvoice("partially_paid", "void")).toBe(false)
    expect(canTransitionInvoice("paid", "void")).toBe(false)
    expect(canTransitionInvoice("void", "issued")).toBe(false)
  })

  it("todo estado tiene transiciones definidas", () => {
    for (const status of INVOICE_STATUSES) expect(INVOICE_TRANSITIONS[status]).toBeDefined()
  })
})

describe("canVoidInvoice", () => {
  it("se anula solo si está emitido y sin cobros", () => {
    expect(canVoidInvoice({ status: "issued", paid: "0.00" })).toBe(true)
    expect(canVoidInvoice({ status: "issued", paid: "10.00" })).toBe(false)
    expect(canVoidInvoice({ status: "paid", paid: "0.00" })).toBe(false)
  })
})

describe("invoiceCode", () => {
  it("une serie y número", () => {
    expect(invoiceCode({ series: "F001", number: "00000123" })).toBe("F001-00000123")
  })
})
