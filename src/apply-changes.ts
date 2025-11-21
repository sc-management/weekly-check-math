import {
  ApplyChangeResult,
  InventoryPurchaseRaw,
  WeeklyChange,
  WeeklyCheckingSummary,
} from './types';
import { produce } from 'immer';
import { summarizeInventoryForLocation } from './inventory';
import { computeLocationWeeklyMetrics } from './location-metrics';
import { summarizeWeeklyChecking } from './summarize-weekly-checking';

export function applyWeeklyCheckChanges(
  current: WeeklyCheckingSummary,
  changes: WeeklyChange[],
): ApplyChangeResult {
  const nextState: WeeklyCheckingSummary = produce(current, (draft) => {
    for (const c of changes) {
      if (c.kind === 'location-raw') {
        const loc = draft.rows.find((l) => l.locationId === c.locationId);
        if (!loc) continue;
        loc[c.field] = c.value ?? 0;
      } else if (c.kind === 'inventory-purchase') {
        const loc = draft.rows.find((l) => l.locationId === c.locationId);
        if (!loc) continue;
        const key = c.vendorId;
        const group = loc.inventorySummary.groups.find((g) => g.key === key);
        if (group) {
          group[c.field] = c.value ?? 0;
        } else {
          loc.inventorySummary.groups.push({
            key: c.vendorId,
            label: c.vendorName ?? 'Unknown',
            amount: c.value ?? 0,
          });
        }
      }
    }

    // recompute inventory Summary in each location

    for (let i = 0; i < draft.rows.length; i++) {
      const loc = draft.rows[i];
      const inventoryPurchases: InventoryPurchaseRaw[] = loc.inventorySummary.groups.map((g) => ({
        locationId: loc.locationId,
        weekStartDate: loc.weekStartDate,
        vendorId: g.key,
        vendorName: g.label,
        amount: g.amount,
      }));
      const newInventorySummary = summarizeInventoryForLocation(inventoryPurchases);

      draft.rows[i] = computeLocationWeeklyMetrics(loc, newInventorySummary);
    }
    const summary = summarizeWeeklyChecking(draft.rows);
    draft.rows = summary.rows;
    draft.total = summary.total;
    draft.average = summary.average;
  });

  return { next: nextState };
}
