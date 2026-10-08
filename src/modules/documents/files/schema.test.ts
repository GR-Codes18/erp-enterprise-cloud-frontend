import { describe, expect, it } from "vitest"
import { MAX_FILE_SIZE_BYTES } from "./fileRules"
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  ENTITY_LABELS,
  ENTITY_TYPES,
  FILTER_ALL,
  buildDocumentFilters,
  documentInputSchema,
  isValidDateRange,
  uploadFormSchema,
} from "./schema"

const valid = {
  name: "Contrato de servicio.pdf",
  category: "contract",
  entity_type: "",
  entity_id: "",
  mime_type: "application/pdf",
  size: 245_760,
}

const invalidFields = (input: unknown) => {
  const result = documentInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("documentInputSchema", () => {
  it("acepta metadatos válidos sin registro relacionado", () => {
    expect(documentInputSchema.safeParse(valid).success).toBe(true)
  })

  it("acepta metadatos con tipo y registro relacionados", () => {
    const related = { ...valid, entity_type: "purchase", entity_id: "00000000-0000-4000-8099-000000000001" }
    expect(documentInputSchema.safeParse(related).success).toBe(true)
  })

  it("exige que tipo y registro relacionados vayan juntos", () => {
    expect(invalidFields({ ...valid, entity_type: "purchase" })).toContain("entity_id")
    expect(invalidFields({ ...valid, entity_id: "abc" })).toContain("entity_type")
  })

  it("rechaza un nombre vacío o demasiado largo", () => {
    expect(invalidFields({ ...valid, name: "A" })).toContain("name")
    expect(invalidFields({ ...valid, name: "x".repeat(121) })).toContain("name")
  })

  it("rechaza una categoría o un tipo de registro desconocidos", () => {
    expect(invalidFields({ ...valid, category: "secreto" })).toContain("category")
    expect(invalidFields({ ...valid, entity_type: "otro", entity_id: "x" })).toContain("entity_type")
  })

  it("rechaza tipos de archivo no permitidos", () => {
    expect(invalidFields({ ...valid, mime_type: "application/x-msdownload" })).toContain("mime_type")
  })

  it("valida el tamaño: positivo, entero y hasta el máximo", () => {
    expect(documentInputSchema.safeParse({ ...valid, size: MAX_FILE_SIZE_BYTES }).success).toBe(true)
    expect(invalidFields({ ...valid, size: MAX_FILE_SIZE_BYTES + 1 })).toContain("size")
    expect(invalidFields({ ...valid, size: 0 })).toContain("size")
    expect(invalidFields({ ...valid, size: 10.5 })).toContain("size")
  })
})

describe("uploadFormSchema", () => {
  it("acepta nombre y categoría", () => {
    expect(uploadFormSchema.safeParse({ name: "Acta", category: "other" }).success).toBe(true)
  })

  it("rechaza un nombre vacío", () => {
    expect(uploadFormSchema.safeParse({ name: "  ", category: "other" }).success).toBe(false)
  })
})

describe("etiquetas", () => {
  it("toda categoría y tipo de registro tiene su etiqueta en español", () => {
    for (const category of DOCUMENT_CATEGORIES) expect(CATEGORY_LABELS[category]).toBeTruthy()
    for (const entity of ENTITY_TYPES) expect(ENTITY_LABELS[entity]).toBeTruthy()
  })
})

describe("buildDocumentFilters", () => {
  it("sin selección no envía ningún filtro", () => {
    expect(buildDocumentFilters({ category: FILTER_ALL, entity_type: FILTER_ALL })).toEqual({})
  })

  it("envía solo los filtros elegidos", () => {
    expect(buildDocumentFilters({ category: "invoice", entity_type: FILTER_ALL })).toEqual({
      category: "invoice",
    })
  })
})

describe("isValidDateRange", () => {
  it("acepta rangos en orden y rangos abiertos", () => {
    expect(isValidDateRange("2026-10-01", "2026-10-07")).toBe(true)
    expect(isValidDateRange("", "2026-10-07")).toBe(true)
    expect(isValidDateRange("", "")).toBe(true)
  })

  it("rechaza desde posterior a hasta", () => {
    expect(isValidDateRange("2026-10-08", "2026-10-07")).toBe(false)
  })
})