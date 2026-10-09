import { FolderOpen } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

// Lo que este módulo publica para otros (regla 0.5): tipos y, como única excepción
// acordada en el manual (8.2), el DocumentsPanel para incrustar adjuntos en los detalles.
export { DocumentsPanel } from "./files/components/DocumentsPanel"
export type { DocumentEntity } from "./files/components/UploadDocumentDialog"
export type { EntityType as DocumentEntityType } from "./files/schema"

export const documentsModule: AppModule = {
  id: "documents",
  label: "Documentos",
  icon: FolderOpen,
  basePath: "documents",
  sections: [
    {
      items: [{ label: "Archivos", path: "files", permission: "documents.files:view", page: () => import("./pages/FilesPage") }],
    },
  ],
}
