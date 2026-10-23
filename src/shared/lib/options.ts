/**
 * Regla 4: los inactivos no se ofrecen en documentos nuevos, pero sí se muestran
 * en los documentos que ya los usan. Deja las opciones activas más las que el
 * documento ya tiene elegidas.
 */
export function activeOrSelected<T extends { id: string; status: string }>(
  options: readonly T[],
  selectedIds: readonly string[],
): T[] {
  return options.filter((option) => option.status === "active" || selectedIds.includes(option.id))
}

/** Producto elegible en un documento (lo que necesitan los editores de líneas) */
export interface ProductChoice {
  id: string
  sku: string
  name: string
  unit: string
}

/**
 * Productos activos (filtrados por el servidor) más los que el documento ya usa y no están
 * entre ellos, porque hoy están inactivos. Así un borrador antiguo no queda con el selector
 * vacío, y los inactivos no ocupan el cupo de opciones de los documentos nuevos (regla 4).
 */
export function withDocumentProducts(
  active: readonly ProductChoice[],
  items: readonly { product_id: string; product_name?: string }[],
): ProductChoice[] {
  const known = new Set(active.map((product) => product.id))
  const missing = new Map<string, ProductChoice>()
  for (const item of items) {
    if (item.product_id && !known.has(item.product_id) && !missing.has(item.product_id)) {
      missing.set(item.product_id, {
        id: item.product_id,
        sku: "—",
        name: `${item.product_name ?? "Producto"} (inactivo)`,
        unit: "",
      })
    }
  }
  return [...active, ...missing.values()]
}
