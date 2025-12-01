import { percent, round } from './utils';
import { LocationInventorySummary, LocationWeeklyMetrics, LocationWeeklyRaw } from './types';

/**
 * 基于原始数据 + 库存汇总，计算单店的所有派生指标
 */
export function computeLocationWeeklyMetrics(
  raw: LocationWeeklyRaw,
  inventory: LocationInventorySummary,
): LocationWeeklyMetrics {
  const totalLabor = raw.fohLaborAmount + raw.bohLaborAmount;

  const discountVoidsTotal = raw.discountsAmount + raw.voidsAmount;

  const foodCost = inventory.foodCostAmount;

  const totalRevenue = raw.totalRevenueAmount;

  // percent函数返回的是小数形式的百分比，例如0.1234表示12.34%
  // 内部有调用safeDivide，分母为0时返回0
  const fohLaborPct = percent(raw.fohLaborAmount, totalRevenue);
  const bohLaborPct = percent(raw.bohLaborAmount, totalRevenue);
  const totalLaborPct = percent(totalLabor, totalRevenue);

  const discountVoidsPct = percent(discountVoidsTotal, totalRevenue);

  // 计算adjustedSalesAmount
  const onlineSalesActual = raw.onlineSalesActualAmount || 0;
  const onlineSalesClover = raw.onlineSalesCloverAmount || 0;
  const adjustedSalesAmount = round(totalRevenue - onlineSalesActual * 0.2, 0);
  const inventoryPurchasesPct = percent(foodCost, adjustedSalesAmount);

  // 计算onlineSalesPercent
  const onlineSalesPct = percent(onlineSalesActual || onlineSalesClover, totalRevenue);

  return {
    ...raw,
    fohLaborPercent: fohLaborPct,
    bohLaborPercent: bohLaborPct,
    totalLaborPercent: totalLaborPct,
    inventorySummary: inventory,
    discountVoidsPercent: discountVoidsPct,
    adjustedSalesAmount,
    inventoryPurchasesPercent: inventoryPurchasesPct,
    onlineSalesPercent: onlineSalesPct,
  };
}
