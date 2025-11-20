export type MoneyCents = number; // 金额，单位为分
export type Percentage = number; // 百分比，0..1 之间的小数

/**
 * 单店单周期的“原始事实数据”
 * 这些一般都来自 DB / 外部系统，不在本包里修改
 */
export interface LocationWeeklyRaw {
  locationId: string;
  /** ISO 日期字符串，例如 2024-11-11 */
  weekStartDate: string;

  // --- Revenue & cash ---
  totalRevenue: MoneyCents;

  weeklyCashClover: MoneyCents;
  actualDeposit: MoneyCents;

  voidsAmount: MoneyCents;
  discountsAmount: MoneyCents;
  refundsAmount: MoneyCents;

  // --- Ops ---
  seats: number | null;
  hoursOpen: number | null;

  // --- Tips & labor ---
  totalTips: MoneyCents;
  fohLabor: MoneyCents;
  bohLabor: MoneyCents;

  // Online / other income（可选）
  onlineSalesClover?: MoneyCents;
  onlineSalesActual: MoneyCents;
  ghostKitchenIncome?: MoneyCents;
}

/**
 * 采购记录（按Vendor分）
 */
export interface InventoryPurchaseRaw {
  locationId: string;
  weekStartDate: string;

  vendorId: string;
  vendorName: string;

  amount: MoneyCents;
}

/**
 * 用于把多家 vendor / 多种 category 汇总成表格列的配置
 * 例如：gordon / seafood / usFood / oto / localOther...
 */
export interface InventoryGroupConfig {
  /** 唯一 key，用于前端识别列 */
  key: string;
  /** 列标题展示用 */
  label: string;
  /** 匹配 vendorId */
  vendorIds?: string[];
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
  foodCost: MoneyCents;
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

  // Online sales
  onlineSalesPercent: Percentage; // onlineSalesActual / totalRevenue
}
