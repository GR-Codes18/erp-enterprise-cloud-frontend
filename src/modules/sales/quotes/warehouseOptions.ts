export function buildWarehouseOptionsForProduct(
  productId: string,
  warehouses: Array<{ id: string; name: string }>,
  stockRows: Array<{ product_id: string; warehouse_id: string; quantity: number }> = [],
) {
  if (!productId) return []
  const warehouseIdsWithStock = new Set(
    stockRows
      .filter((row) => row.product_id === productId && row.quantity > 0)
      .map((row) => row.warehouse_id),
  )

  return warehouses.filter((warehouse) => warehouseIdsWithStock.has(warehouse.id))
}
