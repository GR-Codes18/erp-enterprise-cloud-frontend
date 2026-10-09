import { describe, expect, it } from "vitest"
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  formatFileSize,
  resolveMimeType,
  validateFile,
} from "./fileRules"

const pdf = { name: "contrato.pdf", size: 245_760, type: "application/pdf" }

describe("validateFile", () => {
  it("acepta los tipos permitidos", () => {
    expect(validateFile(pdf)).toBeNull()
    expect(validateFile({ name: "foto.PNG", size: 1000, type: "image/png" })).toBeNull()
    expect(validateFile({ name: "foto.jpeg", size: 1000, type: "image/jpeg" })).toBeNull()
    expect(
      validateFile({
        name: "stock.xlsx",
        size: 1000,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).toBeNull()
    expect(
      validateFile({
        name: "acta.docx",
        size: 1000,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toBeNull()
  })

  it("acepta un archivo justo en el límite y rechaza uno que lo supera", () => {
    expect(validateFile({ ...pdf, size: MAX_FILE_SIZE_BYTES })).toBeNull()
    expect(validateFile({ ...pdf, size: MAX_FILE_SIZE_BYTES + 1 })).toContain(MAX_FILE_SIZE_LABEL)
  })

  it("rechaza un archivo vacío", () => {
    expect(validateFile({ ...pdf, size: 0 })).toBe("El archivo está vacío")
  })

  it("rechaza tipos no permitidos o desconocidos", () => {
    expect(validateFile({ name: "setup.exe", size: 1000, type: "application/x-msdownload" })).toContain(
      "Tipo de archivo no permitido",
    )
    expect(validateFile({ name: "notas.txt", size: 1000, type: "" })).toContain(
      "Tipo de archivo no permitido",
    )
  })

  it("rechaza una extensión que no corresponde al tipo declarado", () => {
    expect(validateFile({ name: "virus.exe", size: 1000, type: "application/pdf" })).toBe(
      "La extensión del archivo no coincide con su tipo",
    )
    expect(validateFile({ name: "sin-extension", size: 1000, type: "application/pdf" })).toBe(
      "La extensión del archivo no coincide con su tipo",
    )
  })
})

describe("formatFileSize", () => {
  it("formatea bytes, kilobytes y megabytes", () => {
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(245_760)).toBe("240 KB")
    expect(formatFileSize(1_572_864)).toBe("1.5 MB")
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10 MB")
  })
})

describe("constantes derivadas", () => {
  it("el atributo accept lista todas las extensiones", () => {
    expect(ACCEPT_ATTRIBUTE).toBe(".pdf,.png,.jpg,.jpeg,.xlsx,.docx")
  })

  it("la etiqueta del máximo coincide con el límite", () => {
    expect(MAX_FILE_SIZE_LABEL).toBe("10 MB")
  })
})

describe("resolveMimeType", () => {
  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

  it("usa el tipo que informa el sistema", () => {
    expect(resolveMimeType(pdf)).toBe("application/pdf")
  })

  it("si el sistema no informa el tipo, lo deduce de la extensión permitida", () => {
    expect(resolveMimeType({ name: "informe.DOCX", type: "" })).toBe(DOCX)
    expect(validateFile({ name: "informe.docx", size: 1000, type: "" })).toBeNull()
  })

  it("una extensión no permitida sin tipo sigue rechazándose", () => {
    expect(resolveMimeType({ name: "script.exe", type: "" })).toBe("")
    expect(validateFile({ name: "script.exe", size: 1000, type: "" })).toContain("no permitido")
  })
})
