// apply-changes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InventoryPurchaseRaw, WeeklyChange, WeeklyCheckingSummary } from '../src';

// 先 mock 掉依赖的 3 个模块（路径要和实现里一致）
vi.mock('../src/inventory', () => ({
  summarizeInventoryForLocation: vi.fn((purchases: InventoryPurchaseRaw[]) => {
    // 简单地把 amount 相加作为 foodCostAmount，group 原样返回
    const foodCostAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
    return {
      locationId: purchases[0]?.locationId ?? 'unknown',
      weekStartDate: purchases[0]?.weekStartDate ?? '1970-01-01',
      groups: purchases.map((p) => ({
        key: p.vendorId,
        label: p.vendorName,
        amount: p.amount,
      })),
      foodCostAmount,
    };
  }),
}));

vi.mock('../src/location-metrics', () => ({
  computeLocationWeeklyMetrics: vi.fn((loc: any, inventorySummary: any) => {
    // 返回一个带标记字段、且 inventorySummary 替换后的新对象
    return {
      ...loc,
      inventorySummary,
      __recomputed: true,
    };
  }),
}));

vi.mock('../src/summarize-weekly-checking', () => ({
  summarizeWeeklyChecking: vi.fn((rows: any[]) => {
    // 简单起见：total / average 都指向第一条
    const first = rows[0];
    return {
      rows,
      total: first,
      average: first,
    };
  }),
}));

// 在 mock 之后再 import 被测函数
import { summarizeInventoryForLocation } from '../src';
import { computeLocationWeeklyMetrics } from '../src';
import { summarizeWeeklyChecking } from '../src';
import { applyChanges } from '../src';

const summarizeInventoryForLocationMock = summarizeInventoryForLocation as ReturnType<typeof vi.fn>;
const computeLocationWeeklyMetricsMock = computeLocationWeeklyMetrics as ReturnType<typeof vi.fn>;
const summarizeWeeklyCheckingMock = summarizeWeeklyChecking as ReturnType<typeof vi.fn>;

describe('applyChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createBaseSummary(): WeeklyCheckingSummary {
    // 为了简化，很多字段直接用 0 / null，然后用 as any 规避类型噪音
    const baseLocation: any = {
      locationId: 'LOC1',
      weekStartDate: '2024-11-11',
      // raw 部分
      totalRevenueAmount: 100_00,
      weeklyCashCloverAmount: 0,
      actualDepositAmount: 0,
      voidsAmount: 0,
      discountsAmount: 0,
      refundsAmount: 0,
      seats: null,
      hoursOpen: null,
      totalTipsAmount: 0,
      fohLaborAmount: 0,
      bohLaborAmount: 0,
      onlineSalesActualAmount: 0,
      // metrics 部分（初始值无所谓，反正会被 computeLocationWeeklyMetrics 替换）
      fohLaborPercent: 0,
      bohLaborPercent: 0,
      totalLaborPercent: 0,
      discountVoidsPercent: 0,
      adjustedSalesAmount: 0,
      inventoryPurchasesPercent: 0,
      onlineSalesPercent: 0,
      inventorySummary: {
        locationId: 'LOC1',
        weekStartDate: '2024-11-11',
        groups: [
          {
            key: 'VENDOR_A',
            label: 'Vendor A',
            amount: 50_00,
          },
        ],
        foodCostAmount: 50_00,
      },
    };

    const summary: WeeklyCheckingSummary = {
      rows: [baseLocation],
      total: baseLocation,
      average: baseLocation,
    };

    return summary;
  }

  it('should apply location-raw changes and recompute metrics & summary', () => {
    const current = createBaseSummary();

    const changes: WeeklyChange[] = [
      {
        kind: 'location-raw',
        locationId: 'LOC1',
        field: 'totalRevenueAmount',
        value: 200_00,
      },
    ];

    const result = applyChanges(current, changes);

    // 1️⃣ location-raw 字段被更新
    expect(result.next.rows[0].totalRevenueAmount).toBe(200_00);

    // 2️⃣ 每个 location 都有重新算 inventorySummary & metrics
    expect(summarizeInventoryForLocationMock).toHaveBeenCalledTimes(1);
    expect(computeLocationWeeklyMetricsMock).toHaveBeenCalledTimes(1);

    // summarizeInventoryForLocation 接收的 purchases 是从 groups 映射出来的
    const purchasesArg = summarizeInventoryForLocationMock.mock
      .calls[0][0] as InventoryPurchaseRaw[];
    expect(purchasesArg).toHaveLength(1);
    expect(purchasesArg[0]).toMatchObject({
      locationId: 'LOC1',
      weekStartDate: '2024-11-11',
      vendorId: 'VENDOR_A',
      vendorName: 'Vendor A',
      amount: 50_00,
    });

    // computeLocationWeeklyMetrics 的返回值被真正写回 rows[i]
    const recomputedLoc = result.next.rows[0] as any;
    expect(recomputedLoc.__recomputed).toBe(true);

    // 3️⃣ 最终 summary 由 summarizeWeeklyChecking 决定
    expect(summarizeWeeklyCheckingMock).toHaveBeenCalledTimes(1);
    expect(result.next.total).toBe(result.next.rows[0]);
    expect(result.next.average).toBe(result.next.rows[0]);
  });

  it('should apply inventory-purchase changes (update amount & insert new vendor) and recompute', () => {
    const current = createBaseSummary();

    const changes: WeeklyChange[] = [
      // 更新已有 vendor 的金额（label 不应该被改）
      {
        kind: 'inventory-purchase',
        locationId: 'LOC1',
        vendorId: 'VENDOR_A',
        field: 'amount',
        value: 80_00,
        vendorName: 'SHOULD_NOT_BE_USED', // 更新时不会用到这个
      },
      // 新增一个 vendor（会用到 vendorName 作为 label）
      {
        kind: 'inventory-purchase',
        locationId: 'LOC1',
        vendorId: 'VENDOR_B',
        field: 'amount',
        value: 30_00,
        vendorName: 'Vendor B',
      },
    ];

    const result = applyChanges(current, changes);
    const loc = result.next.rows[0];

    const groups = loc.inventorySummary.groups;
    const groupA = groups.find((g: any) => g.key === 'VENDOR_A');
    const groupB = groups.find((g: any) => g.key === 'VENDOR_B');

    // ✅ 更新已有 vendor：amount 被更新，label 保持原值
    expect(groupA).toMatchObject({
      key: 'VENDOR_A',
      label: 'Vendor A', // 注意：不变
      amount: 80_00,
    });

    // ✅ 新增 vendor：amount 和 label 都按新值
    expect(groupB).toMatchObject({
      key: 'VENDOR_B',
      label: 'Vendor B',
      amount: 30_00,
    });

    // summarizeInventoryForLocation 用更新后的 groups 生成 purchases
    expect(summarizeInventoryForLocationMock).toHaveBeenCalledTimes(1);
    const purchasesArg = summarizeInventoryForLocationMock.mock
      .calls[0][0] as InventoryPurchaseRaw[];
    // 现在应该有 2 个 vendor 传进去
    expect(purchasesArg).toHaveLength(2);
    expect(purchasesArg.map((p) => p.vendorId)).toEqual(
      expect.arrayContaining(['VENDOR_A', 'VENDOR_B']),
    );

    // 仍然会重新算 metrics & summary
    expect(computeLocationWeeklyMetricsMock).toHaveBeenCalledTimes(1);
    expect(summarizeWeeklyCheckingMock).toHaveBeenCalledTimes(1);
  });
});
