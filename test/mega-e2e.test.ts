// mega-e2e.test.ts
import { describe, it, expect } from 'vitest';

import { summarizeInventoryForLocation } from '../src';
import { computeLocationWeeklyMetrics } from '../src';
import { summarizeWeeklyChecking } from '../src';
import { InventoryPurchaseRaw, LocationWeeklyRaw } from '../src';
import { percent } from '../src/utils';

describe('weekly-check-math mega E2E (Newton + Quincy)', () => {
  it('runs full pipeline: raw -> inventory -> metrics -> weekly summary', () => {
    // ===============================
    // 1. 准备两家店的原始数据（来自 Excel）
    // ===============================

    const rawNewton: LocationWeeklyRaw = {
      locationId: 'Newton',
      weekStartDate: '2024-11-10',
      totalRevenueAmount: 15_775,
      fohLaborAmount: 2_380,
      bohLaborAmount: 2_346,
      discountsAmount: 166,
      voidsAmount: 0,
      refundsAmount: 0,
      onlineSalesActualAmount: 0, // 为了简化，设成 0
    } as LocationWeeklyRaw;

    const rawQuincy: LocationWeeklyRaw = {
      locationId: 'Quincy',
      weekStartDate: '2024-11-10',
      totalRevenueAmount: 21_121,
      fohLaborAmount: 2_368,
      bohLaborAmount: 3_930,
      discountsAmount: 217,
      voidsAmount: 167,
      refundsAmount: 0,
      onlineSalesActualAmount: 0,
    } as LocationWeeklyRaw;

    const raws: LocationWeeklyRaw[] = [rawNewton, rawQuincy];

    // ===============================
    // 2. 准备采购（InventoryPurchaseRaw）
    // ===============================
    const purchases: InventoryPurchaseRaw[] = [
      // Newton
      {
        locationId: 'Newton',
        weekStartDate: '2024-11-10',
        vendorId: 'gordon',
        vendorName: 'Gordon',
        amount: 4_769,
      },
      {
        locationId: 'Newton',
        weekStartDate: '2024-11-10',
        vendorId: 'oto',
        vendorName: 'OTO Trade',
        amount: 4_747,
      },
      // Quincy
      {
        locationId: 'Quincy',
        weekStartDate: '2024-11-10',
        vendorId: 'gordon',
        vendorName: 'Gordon',
        amount: 4_825,
      },
      {
        locationId: 'Quincy',
        weekStartDate: '2024-11-10',
        vendorId: 'oto',
        vendorName: 'OTO Trade',
        amount: 6_540,
      },
    ];

    // ===============================
    // 3. inventorySummary + metrics
    // ===============================
    const metrics = raws.map((raw) => {
      const inv = summarizeInventoryForLocation(
        purchases.filter(
          (p) => p.locationId === raw.locationId && p.weekStartDate === raw.weekStartDate,
        ),
      );

      return computeLocationWeeklyMetrics(raw, inv);
    });

    // 防御：应该有两条
    expect(metrics).toHaveLength(2);

    const newton = metrics.find((m) => m.locationId === 'Newton')!;
    const quincy = metrics.find((m) => m.locationId === 'Quincy')!;

    // ===============================
    // 4. 校验单店结果是否符合预期
    //    （labor%、discount%、inventory%）
    // ===============================

    // Newton 期望值（用当前 utils.percent 算，避免和实现不一致）
    const newtonTotalRevenue = rawNewton.totalRevenueAmount;
    const newtonTotalLabor = rawNewton.fohLaborAmount + rawNewton.bohLaborAmount;
    const newtonDiscountVoids = rawNewton.discountsAmount + rawNewton.voidsAmount;
    const newtonFoodCost = 4_769 + 4_747; // summarizeInventoryForLocation 也会这么算

    const expectedNewtonFohPct = percent(rawNewton.fohLaborAmount, newtonTotalRevenue);
    const expectedNewtonBohPct = percent(rawNewton.bohLaborAmount, newtonTotalRevenue);
    const expectedNewtonTotalLaborPct = percent(newtonTotalLabor, newtonTotalRevenue);
    const expectedNewtonDiscVoidPct = percent(newtonDiscountVoids, newtonTotalRevenue);
    const expectedNewtonInventoryPct = percent(newtonFoodCost, newtonTotalRevenue);

    expect(newton.fohLaborPercent).toBeCloseTo(expectedNewtonFohPct, 6);
    expect(newton.bohLaborPercent).toBeCloseTo(expectedNewtonBohPct, 6);
    expect(newton.totalLaborPercent).toBeCloseTo(expectedNewtonTotalLaborPct, 6);
    expect(newton.discountVoidsPercent).toBeCloseTo(expectedNewtonDiscVoidPct, 6);
    expect(newton.inventoryPurchasesPercent).toBeCloseTo(expectedNewtonInventoryPct, 6);

    // 顺便和 Excel 上肉眼值对比（Newton：15.09 / 14.87 / 29.96 / 1.05 / 60.33）
    expect(newton.fohLaborPercent).toBeCloseTo(0.1509, 4);
    expect(newton.bohLaborPercent).toBeCloseTo(0.1487, 4);
    expect(newton.totalLaborPercent).toBeCloseTo(0.2996, 4);
    expect(newton.discountVoidsPercent).toBeCloseTo(0.0105, 4);
    expect(newton.inventoryPurchasesPercent).toBeCloseTo(
      0.6033,
      3, // 这里 Excel 是 9517/15775，你代码是 9516/15775，略有差异
    );

    // Quincy 期望值
    const quincyTotalRevenue = rawQuincy.totalRevenueAmount;
    const quincyTotalLabor = rawQuincy.fohLaborAmount + rawQuincy.bohLaborAmount;
    const quincyDiscountVoids = rawQuincy.discountsAmount + rawQuincy.voidsAmount;
    const quincyFoodCost = 4_825 + 6_540;

    const expectedQuincyFohPct = percent(rawQuincy.fohLaborAmount, quincyTotalRevenue);
    const expectedQuincyBohPct = percent(rawQuincy.bohLaborAmount, quincyTotalRevenue);
    const expectedQuincyTotalLaborPct = percent(quincyTotalLabor, quincyTotalRevenue);
    const expectedQuincyDiscVoidPct = percent(quincyDiscountVoids, quincyTotalRevenue);
    const expectedQuincyInventoryPct = percent(quincyFoodCost, quincyTotalRevenue);

    expect(quincy.fohLaborPercent).toBeCloseTo(expectedQuincyFohPct, 6);
    expect(quincy.bohLaborPercent).toBeCloseTo(expectedQuincyBohPct, 6);
    expect(quincy.totalLaborPercent).toBeCloseTo(expectedQuincyTotalLaborPct, 6);
    expect(quincy.discountVoidsPercent).toBeCloseTo(expectedQuincyDiscVoidPct, 6);
    expect(quincy.inventoryPurchasesPercent).toBeCloseTo(expectedQuincyInventoryPct, 6);

    // 和 Excel 上肉眼值对比（Quincy：11.21 / 18.61 / 29.82 / 1.82 / 53.81）
    expect(quincy.fohLaborPercent).toBeCloseTo(0.1121, 4);
    expect(quincy.bohLaborPercent).toBeCloseTo(0.1861, 4);
    expect(quincy.totalLaborPercent).toBeCloseTo(0.2982, 4);
    expect(quincy.discountVoidsPercent).toBeCloseTo(0.0182, 4);
    expect(quincy.inventoryPurchasesPercent).toBeCloseTo(0.5381, 4);

    // ===============================
    // 5. 跑 summarizeWeeklyChecking
    // ===============================
    const summary = summarizeWeeklyChecking(metrics);

    expect(summary.rows).toHaveLength(2);

    // total 行：金额 = 两家之和
    expect(summary.total.totalRevenueAmount).toBe(15_775 + 21_121);
    expect(summary.total.fohLaborAmount).toBe(2_380 + 2_368);
    expect(summary.total.bohLaborAmount).toBe(2_346 + 3_930);

    // total 的 inventorySummary：group 聚合
    const totalInv = summary.total.inventorySummary;
    // Newton: 4769 + 4747; Quincy: 4825 + 6540
    expect(totalInv.foodCostAmount).toBe(4_769 + 4_747 + (4_825 + 6_540));

    // gordon 合计 = 4769 + 4825
    const gordonTotal = totalInv.groups.find((g) => g.key === 'gordon');
    expect(gordonTotal?.amount).toBe(4_769 + 4_825);

    // oto 合计 = 4747 + 6540
    const otoTotal = totalInv.groups.find((g) => g.key === 'oto');
    expect(otoTotal?.amount).toBe(4_747 + 6_540);

    // average 行：金额 ≈ total / 2（四舍五入到整数）
    expect(summary.average.totalRevenueAmount).toBe(
      Math.round(summary.total.totalRevenueAmount / 2),
    );
    expect(summary.average.inventorySummary.foodCostAmount).toBe(
      Math.round(totalInv.foodCostAmount / 2),
    );
  });
});
