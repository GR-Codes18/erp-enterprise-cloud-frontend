import { Boxes } from "lucide-react"
import type { AppModule } from "@/shared/types/module"

export const inventoryModule: AppModule = {
  id: "inventory",
  label: "Inventario",
  icon: Boxes,
  basePath: "inventory",
  sections: [
    {
      items: [
        { label: "Stock", path: "stock" },
        { label: "Kardex", path: "kardex" },
        { label: "Transferencias", path: "transfers" },
        { label: "Ajustes", path: "adjustments" },
      ],
    },
  ],
}
