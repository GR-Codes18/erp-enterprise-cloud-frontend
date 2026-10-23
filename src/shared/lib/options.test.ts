import { describe, expect, it } from "vitest"
import { activeOrSelected, withDocumentProducts } from "./options"

const options = [
  { id: "1", status: "active" },
  { id: "2", status: "inactive" },
  { id: "3", status: "inactive" },
]

describe("activeOrSelected", () => {
  it("en un documento nuevo solo ofrece activos", () => {
    expect(activeOrSelected(options, []).map((o) => o.id)).toEqual(["1"])
  })

  it("conserva el inactivo que el documento ya usa, sin ofrecer otros inactivos", () => {
    expect(activeOrSelected(options, ["2"]).map((o) => o.id)).toEqual(["1", "2"])
  })
})

describe("withDocumentProducts", () => {
  const active = [{ id: "p1", sku: "PROD-001", name: "Martillo", unit: "UND" }]

  it("agrega solo los productos del documento que no están entre los activos", () => {
    const result = withDocumentProducts(active, [
      { product_id: "p1", product_name: "Martillo" },
      { product_id: "p9", product_name: "Silicona" },
      { product_id: "p9", product_name: "Silicona" },
    ])
    expect(result.map((p) => p.id)).toEqual(["p1", "p9"])
    expect(result[1].name).toBe("Silicona (inactivo)")
  })

  it("un documento nuevo solo ve los activos", () => {
    expect(withDocumentProducts(active, [])).toEqual(active)
  })
})
