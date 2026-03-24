import { describe, it, expect } from 'vitest';

import { computeLocationWeeklyMetrics } from '../src';
import { percent, round } from '../src/utils';
import { LocationInventorySummary, LocationWeeklyRaw } from '../src';

describe('computeLocationWeeklyMetrics (Newton from Excel)', () => {
  it('should match the Newton row in the weekly Excel sheet', () => {
    // 📊 Newton 原始数据（单位：跟你类型一致，这里按「表上数字」直接写）
    const rawNewton = {
      locationId: 'Newton',
      weekStartDate: '2024-11-10',

      // Revenue & labor
      cloverRevenueAmount: 15775,
      thirdPartyRevenueAmount: 0,
      fohLaborAmount: 2380,
      bohLaborAmount: 2346,

      // Discounts & voids
      discountsAmount: 166,
      voidsAmount: 0,

      // 这一周 Newton 的 Online Sales (Actual) 是空的，当 0 处理
      onlineSalesActualAmount: 0,
    } as LocationWeeklyRaw;

    // 🧾 Newton 的库存汇总（Gordon + OTO Trade）
    const inventoryNewton: LocationInventorySummary = {
      locationId: 'Newton',
      weekStartDate: '2024-11-10',
      groups: [
        { key: 'gordon', label: 'Gordon', amount: 4769 },
        { key: 'oto', label: 'OTO Trade', amount: 4747 },
      ],
      foodCostAmount: 9517,
    };

    const result = computeLocationWeeklyMetrics(rawNewton, inventoryNewton);

    const totalRevenue = rawNewton.cloverRevenueAmount + rawNewton.thirdPartyRevenueAmount;
    const totalLabor = rawNewton.fohLaborAmount + rawNewton.bohLaborAmount;
    const discountVoidsTotal = rawNewton.discountsAmount + rawNewton.voidsAmount;
    const onlineSalesActual = rawNewton.onlineSalesActualAmount ?? 0;

    // 用 utils 里的 percent / round 算一遍期望值，
    // 保证和实现的 rounding 规则完全一致
    const expectedFohLaborPct = percent(rawNewton.fohLaborAmount, totalRevenue);
    const expectedBohLaborPct = percent(rawNewton.bohLaborAmount, totalRevenue);
    const expectedTotalLaborPct = percent(totalLabor, totalRevenue);
    const expectedDiscountVoidsPct = percent(discountVoidsTotal, totalRevenue);

    const expectedAdjustedSales = round(totalRevenue - onlineSalesActual * 0.2, 0);
    const expectedInventoryPurchasesPct = percent(
      inventoryNewton.foodCostAmount,
      expectedAdjustedSales,
    );

    const expectedOnlineSalesPct = percent(onlineSalesActual, totalRevenue);

    // ======================
    // ✅ 断言：与内部公式匹配
    // ======================
    expect(result.fohLaborPercent).toBeCloseTo(expectedFohLaborPct, 8);
    expect(result.bohLaborPercent).toBeCloseTo(expectedBohLaborPct, 8);
    expect(result.totalLaborPercent).toBeCloseTo(expectedTotalLaborPct, 8);

    expect(result.discountVoidsPercent).toBeCloseTo(expectedDiscountVoidsPct, 8);

    expect(result.adjustedSalesAmount).toBe(expectedAdjustedSales);
    expect(result.inventoryPurchasesPercent).toBeCloseTo(expectedInventoryPurchasesPct, 8);

    expect(result.onlineSalesPercent).toBeCloseTo(expectedOnlineSalesPct, 8);

    expect(result.inventorySummary).toEqual(inventoryNewton);

    // ======================
    // 📌 断言：与 Excel 上的显示值接近
    // （方便肉眼对比：15.09%、14.87%、29.96%、1.05%、60.33%）
    // ======================
    expect(result.fohLaborPercent).toBeCloseTo(0.1509, 4); // 15.09%
    expect(result.bohLaborPercent).toBeCloseTo(0.1487, 4); // 14.87%
    expect(result.totalLaborPercent).toBeCloseTo(0.2996, 4); // 29.96%

    expect(result.discountVoidsPercent).toBeCloseTo(0.0105, 4); // 1.05%

    expect(result.inventoryPurchasesPercent).toBeCloseTo(0.6033, 4); // 60.33%

    expect(result.onlineSalesPercent).toBeCloseTo(0, 8); // Newton 这一列是 0%
  });

  it('should fall back to totalRevenueAmount when clover/thirdParty are missing (legacy data)', () => {
    const rawLegacy = {
      locationId: 'Legacy',
      weekStartDate: '2024-11-10',
      totalRevenueAmount: 15775,
      // no cloverRevenueAmount or thirdPartyRevenueAmount
      fohLaborAmount: 2380,
      bohLaborAmount: 2346,
      discountsAmount: 166,
      voidsAmount: 0,
      onlineSalesActualAmount: 0,
    } as LocationWeeklyRaw;

    const inventory: LocationInventorySummary = {
      locationId: 'Legacy',
      weekStartDate: '2024-11-10',
      groups: [{ key: 'gordon', label: 'Gordon', amount: 4769 }],
      foodCostAmount: 4769,
    };

    const result = computeLocationWeeklyMetrics(rawLegacy, inventory);

    expect(result.totalRevenueAmount).toBe(15775);
    expect(result.totalLaborPercent).toBeCloseTo(percent(2380 + 2346, 15775), 8);
  });
});
