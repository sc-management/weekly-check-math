import { describe, it, expect } from 'vitest';
import { summarizeInventoryForLocation } from '../src/inventory';
import { InventoryPurchaseRaw } from '../src/types';

describe('summarizeInventoryForLocation', () => {
  it('returns empty summary when purchases = []', () => {
    const result = summarizeInventoryForLocation([]);

    expect(result).toEqual({
      locationId: '',
      weekStartDate: '',
      groups: [],
      foodCostAmount: 0,
    });
  });

  it('aggregates purchases into groups without merging (1:1 vendor)', () => {
    const purchases: InventoryPurchaseRaw[] = [
      {
        locationId: 'Newton',
        weekStartDate: '2024-11-10',
        vendorId: 'gordon',
        vendorName: 'Gordon Food Service',
        amount: 4769,
      },
      {
        locationId: 'Newton',
        weekStartDate: '2024-11-10',
        vendorId: 'oto',
        vendorName: 'OTO Trade',
        amount: 4747,
      },
    ];

    const result = summarizeInventoryForLocation(purchases);

    expect(result.locationId).toBe('Newton');
    expect(result.weekStartDate).toBe('2024-11-10');

    // groups should contain exactly two entries, matching vendorId/vendorName
    expect(result.groups).toEqual([
      { key: 'gordon', label: 'Gordon Food Service', amount: 4769 },
      { key: 'oto', label: 'OTO Trade', amount: 4747 },
    ]);

    // total amount
    expect(result.foodCostAmount).toBe(4769 + 4747);
  });

  it('handles multiple purchases even with same vendorId (does not group/merge)', () => {
    const purchases: InventoryPurchaseRaw[] = [
      {
        locationId: 'Brooklyn',
        weekStartDate: '2024-11-10',
        vendorId: 'seafood',
        vendorName: 'Local Seafood',
        amount: 1000,
      },
      {
        locationId: 'Brooklyn',
        weekStartDate: '2024-11-10',
        vendorId: 'seafood',
        vendorName: 'Local Seafood',
        amount: 2000,
      },
    ];

    const result = summarizeInventoryForLocation(purchases);

    expect(result.groups.length).toBe(2); // ❗ current implementation does NOT merge groups
    expect(result.groups).toEqual([
      { key: 'seafood', label: 'Local Seafood', amount: 1000 },
      { key: 'seafood', label: 'Local Seafood', amount: 2000 },
    ]);

    expect(result.foodCostAmount).toBe(3000);
  });
});
