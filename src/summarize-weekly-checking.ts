import {
  LocationWeeklyMetrics,
  WeeklyCheckingSummary,
  LocationInventorySummary,
  WeeklyChangeLog,
} from './types';
import { percent, round, safeDivide, sum } from './utils';

/**
 * 入口方法：给定 rows，自动生成 total + average
 */
export function summarizeWeeklyChecking(
  rows: LocationWeeklyMetrics[],
  logs: WeeklyChangeLog[],
): WeeklyCheckingSummary {
  const total = computeTotal(rows);
  const average = computeAverage(total, rows.length);

  return {
    rows,
    total,
    average,
    logs,
  };
}

/**
 * 计算 total：所有字段求和
 */
export function computeTotal(rows: LocationWeeklyMetrics[]): LocationWeeklyMetrics {
  if (rows.length === 0) {
    throw new Error('computeTotal: rows cannot be empty');
  }

  const base = rows[0];
  const sumByKey = <K extends keyof LocationWeeklyMetrics>(key: K): any => {
    // number fields → sum
    if (typeof base[key] === 'number') {
      return sum(rows.map((r) => r[key] as number));
    }
    // units/strings → keep as placeholder
    return base[key];
  };

  const inventorySummary = computeTotalInventorySummary(rows);

  return {
    ...base,
    locationId: 'total',
    // --- original + computed ---
    weeklyCashCloverAmount: sumByKey('weeklyCashCloverAmount'),
    actualDepositAmount: sumByKey('actualDepositAmount'),
    voidsAmount: sumByKey('voidsAmount'),
    discountsAmount: sumByKey('discountsAmount'),
    refundsAmount: sumByKey('refundsAmount'),
    seats: null,
    hoursOpen: null,
    totalTipsAmount: sumByKey('totalTipsAmount'),
    fohLaborAmount: sumByKey('fohLaborAmount'),
    bohLaborAmount: sumByKey('bohLaborAmount'),
    onlineSalesCloverAmount: sumByKey('onlineSalesCloverAmount'),
    onlineSalesActualAmount: sumByKey('onlineSalesActualAmount'),
    ghostKitchenIncomeAmount: sumByKey('ghostKitchenIncomeAmount'),
    cloverRevenueAmount: sum(rows.map((r) => r.cloverRevenueAmount)),
    thirdPartyRevenueAmount: sum(rows.map((r) => r.thirdPartyRevenueAmount)),
    totalRevenueAmount: sum(rows.map((r) => r.cloverRevenueAmount)) + sum(rows.map((r) => r.thirdPartyRevenueAmount)),

    // computed
    adjustedSalesAmount: sumByKey('adjustedSalesAmount'),

    // percentages for total will be filled in computeAverage based on total row
    totalLaborPercent: 0,
    discountVoidsPercent: 0,
    inventoryPurchasesPercent: 0,

    inventorySummary,
  };
}

/**
 * average = total / count，百分比重新计算
 */
export function computeAverage(total: LocationWeeklyMetrics, count: number): LocationWeeklyMetrics {
  const div = (v: number) => round(safeDivide(v, count), 0);

  const averageInventorySummary = computeAverageInventorySummary(total.inventorySummary, count);

  return {
    ...total,
    locationId: 'average',

    // divide normal numeric fields
    weeklyCashCloverAmount: div(total.weeklyCashCloverAmount),
    actualDepositAmount: div(total.actualDepositAmount),
    voidsAmount: div(total.voidsAmount),
    discountsAmount: div(total.discountsAmount),
    refundsAmount: div(total.refundsAmount),
    seats: null,
    hoursOpen: null,
    totalTipsAmount: div(total.totalTipsAmount),
    fohLaborAmount: div(total.fohLaborAmount),
    bohLaborAmount: div(total.bohLaborAmount),

    onlineSalesCloverAmount: div(total.onlineSalesCloverAmount || 0),
    onlineSalesActualAmount: div(total.onlineSalesActualAmount),
    ghostKitchenIncomeAmount: div(total.ghostKitchenIncomeAmount || 0),
    cloverRevenueAmount: div(total.cloverRevenueAmount),
    thirdPartyRevenueAmount: div(total.thirdPartyRevenueAmount),
    totalRevenueAmount: div(total.totalRevenueAmount),

    // computed
    adjustedSalesAmount: div(total.adjustedSalesAmount),

    // recompute percentage based on average row
    fohLaborPercent: percent(total.fohLaborAmount, total.totalRevenueAmount),
    bohLaborPercent: percent(total.bohLaborAmount, total.totalRevenueAmount),
    totalLaborPercent: percent(
      total.fohLaborAmount + total.bohLaborAmount,
      total.totalRevenueAmount,
    ),
    discountVoidsPercent: percent(
      total.discountsAmount + total.voidsAmount,
      total.totalRevenueAmount,
    ),
    inventoryPurchasesPercent: percent(
      total.inventorySummary.foodCostAmount,
      total.adjustedSalesAmount,
    ),
    onlineSalesPercent: percent(total.onlineSalesActualAmount, total.totalRevenueAmount),

    inventorySummary: averageInventorySummary,
  };
}

function computeTotalInventorySummary(rows: LocationWeeklyMetrics[]): LocationInventorySummary {
  const inventorySummaries = rows.map((r) => r.inventorySummary);
  const foodCostAmount = sum(inventorySummaries.map((s) => s.foodCostAmount));

  const groupsMap = new Map<string, { key: string; label: string; amount: number }>();
  for (const summary of inventorySummaries) {
    for (const group of summary.groups) {
      const existing = groupsMap.get(group.key);
      if (existing) {
        existing.amount += group.amount;
        existing.label = group.label; // keep last seen label
      } else {
        groupsMap.set(group.key, { ...group });
      }
    }
  }

  const groups = Array.from(groupsMap.values());

  return {
    locationId: 'total',
    weekStartDate: rows[0].weekStartDate,
    groups,
    foodCostAmount,
  };
}

function computeAverageInventorySummary(
  total: LocationInventorySummary,
  count: number,
): LocationInventorySummary {
  const div = (v: number) => round(safeDivide(v, count), 0);

  const groups = total.groups.map((g) => ({
    ...g,
    amount: div(g.amount),
  }));

  return {
    ...total,
    locationId: 'average',
    foodCostAmount: div(total.foodCostAmount),
    groups,
  };
}
