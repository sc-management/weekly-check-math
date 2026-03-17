export type MoneyCents = number; // 金额，单位为分
export type Percentage = number; // 百分比，0..1 之间的小数

export type LocationWeeklyField =
  | 'totalRevenueAmount'
  | 'weeklyCashCloverAmount'
  | 'actualDepositAmount'
  | 'voidsAmount'
  | 'discountsAmount'
  | 'refundsAmount'
  | 'seats'
  | 'hoursOpen'
  | 'totalTipsAmount'
  | 'fohLaborAmount'
  | 'bohLaborAmount'
  | 'onlineSalesCloverAmount'
  | 'onlineSalesActualAmount'
  | 'ghostKitchenIncomeAmount'
  | 'cloverRevenueAmount'
  | 'thirdPartyRevenueAmount';
export type InventoryPurchaseField = 'amount';

export type WeeklyLogKind = 'LOCATION' | 'INVENTORY';

/**
 * 单店单周期的“原始事实数据”
 * 这些一般都来自 DB / 外部系统，不在本包里修改
 */
export interface LocationWeeklyRaw {
  locationId: string;
  locationName: string;
  /** ISO 日期字符串，例如 2024-11-11 */
  weekStartDate: string;

  // --- Revenue & cash ---
  totalRevenueAmount: MoneyCents;

  weeklyCashCloverAmount: MoneyCents;
  actualDepositAmount: MoneyCents;

  voidsAmount: MoneyCents;
  discountsAmount: MoneyCents;
  refundsAmount: MoneyCents;

  // --- Ops ---
  seats: number | null;
  hoursOpen: number | null;

  // --- Tips & labor ---
  totalTipsAmount: MoneyCents;
  fohLaborAmount: MoneyCents;
  bohLaborAmount: MoneyCents;

  // Online / other income（可选）
  onlineSalesCloverAmount?: MoneyCents;
  onlineSalesActualAmount: MoneyCents;
  ghostKitchenIncomeAmount?: MoneyCents;
  cloverRevenueAmount?: MoneyCents;
  thirdPartyRevenueAmount?: MoneyCents;
}

/**
 * 采购记录（按Vendor分，每周汇总，不需要聚合）
 */
export interface InventoryPurchaseRaw {
  locationId: string;
  weekStartDate: string;

  vendorId: string;
  vendorName: string;

  amount: MoneyCents;
}

/**
 * 某店某周期的库存汇总
 */
export interface LocationInventorySummary {
  locationId: string;
  weekStartDate: string;

  /** 每个配置 group 对应一条记录 */
  groups: {
    key: string;
    label: string;
    amount: MoneyCents;
  }[];

  /** 食材相关成本 */
  foodCostAmount: MoneyCents;
}

/**
 * 单店完整指标（原始数据 + 派生字段）
 */
export interface LocationWeeklyMetrics extends LocationWeeklyRaw {
  // Labor
  fohLaborPercent: Percentage; // fohLabor / totalRevenue
  bohLaborPercent: Percentage; // bohLabor / totalRevenue
  totalLaborPercent: Percentage; // (fohLabor + bohLabor) / totalRevenue

  // 折扣 / voids
  discountVoidsPercent: Percentage; // (discountsAmount + voidsAmount) / totalRevenue

  // Inventory
  inventorySummary: LocationInventorySummary;
  adjustedSalesAmount: MoneyCents; // totalRevenue - (onlineSalesActual * 0.2)
  inventoryPurchasesPercent: Percentage; // foodCost / adjustedSalesAmount

  // Online sales
  onlineSalesPercent: Percentage; // onlineSalesActual / totalRevenue
}

/** Weekly Check 整体输出 */
export interface WeeklyCheckingSummary {
  rows: LocationWeeklyMetrics[];
  total: LocationWeeklyMetrics;
  average: LocationWeeklyMetrics;
  logs: WeeklyChangeLog[];
}

export type WeeklyChange =
  | ({ kind: 'location-raw' } & LocationWeeklyUpdate)
  | ({ kind: 'inventory-purchase' } & InventoryPurchaseUpdate);

export type LocationWeeklyUpdate = {
  locationId: string;

  field: LocationWeeklyField;
  value: MoneyCents | null;
};

export type InventoryPurchaseUpdate = {
  locationId: string;
  vendorId: string;
  vendorName?: string;

  field: InventoryPurchaseField;
  value: MoneyCents | null;
};

export interface WeeklyChangeLog {
  id: string;
  kind: WeeklyLogKind;

  // 对应 location or purchase 的 ID
  targetId: string; // weekly_location_id or weekly_purchase_id

  // 方便做跳转：locationId / vendorId 等可以冗余带一下
  locationId?: string;
  vendorId?: string;

  operatorUid: string | null;
  operatorName?: string | null;

  // 你现在的 update_data，建议用 JSON 存 before/after/field
  updateData: unknown;
  timestamp: string; // ISO
}

export type ApplyChangeResult = {
  next: WeeklyCheckingSummary;
};
