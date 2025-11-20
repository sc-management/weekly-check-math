import { InventoryPurchaseRaw, LocationInventorySummary } from './types';

/**
 * 汇总某个门店某周的库存数据
 * 调用方确保传入的 purchases 均为同一 (locationId, weekStartDate)
 */
export function summarizeInventoryForLocation(
  purchases: InventoryPurchaseRaw[],
): LocationInventorySummary {
  if (purchases.length === 0) {
    return {
      locationId: '',
      weekStartDate: '',
      groups: [],
      foodCostAmount: 0,
    };
  }

  const { locationId, weekStartDate } = purchases[0];
  const groups = purchases.map((p) => ({
    key: p.vendorId,
    label: p.vendorName,
    amount: p.amount,
  }));

  return {
    locationId,
    weekStartDate,
    groups,
    foodCostAmount: purchases.reduce((acc, p) => acc + p.amount, 0),
  };
}
