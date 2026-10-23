import { describe, expect, it } from "vitest"
import { toCsv } from "./csv"

describe("toCsv", () => {
  it("escapa comillas y separa filas con salto de línea de Windows", () => {
    const csv = toCsv([{ a: 'Dice "hola"', b: 2 }], [
      { header: "A", value: (row) => row.a },
      { header: "B", value: (row) => row.b },
    ])
    expect(csv).toBe('\uFEFF"A","B"\r\n"Dice ""hola""","2"')
  })

  it("sin filas deja solo los encabezados", () => {
    expect(toCsv([], [{ header: "A", value: () => "" }])).toBe('\uFEFF"A"')
  })
})
