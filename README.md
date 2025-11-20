# @shaking-crab/weekly-check-math 🧮

统一计算门店每周营运数据的数学工具包。
用于将 Homebase / Clover / Vendor 采购数据整合为一致、可复用的指标结构（Revenue、Labor、Discounts、Inventory、Online Sales 等），并生成 **门店行 + Summary Total + Summary Average**。

这是 Shaking Crab 管理系统中周检查（Weekly Check）页面的核心计算逻辑。

## ✨ 功能特性

- 统一的 **Raw → Metrics** 数据管线  
- 自动计算：Labor%、Discount%、Inventory%、Online%、Adjusted Sales  
- 自动汇总 total + average  
- 完整 TypeScript 类型支持  
- 高精度百分比计算  
- 浏览器 + Node 通用（ESM/CJS）

## 📦 安装

```bash
npm install @shaking-crab/weekly-check-math
```

## 🚀 示例

```ts
import {
  summarizeInventoryForLocation,
  computeLocationWeeklyMetrics,
  summarizeWeeklyChecking,
} from '@shaking-crab/weekly-check-math';

const raw = { /* ... */ };
const purchases = [ /* ... */ ];

const inventory = summarizeInventoryForLocation(purchases);
const metrics = computeLocationWeeklyMetrics(raw, inventory);
const summary = summarizeWeeklyChecking([metrics]);

console.log(summary);
```

## 🧪 测试

```bash
npm test
```

包含 utils、inventory、metrics、E2E 全套测试。

## 🔄 发布

```bash
npm run release
```

自动构建 + 打 tag + push + GitHub Actions + npm publish。

需要在 Secrets 设置：

```
NPM_TOKEN
```
