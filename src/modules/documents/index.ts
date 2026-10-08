import { FolderOpen } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const documentsModule: AppModule = {
  id: "documents",
  label: "Documentos",
  icon: FolderOpen,
  basePath: "documents",
  sections: [
    {
      items: [{ label: "Archivos", path: "files", page: () => import("./pages/FilesPage") }],
    },
  ],
}