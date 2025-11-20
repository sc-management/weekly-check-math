import { describe, it, expect } from 'vitest';
import { safeDivide, percent, round, sum } from '../src/utils';

describe('utils.ts', () => {
  // =============================
  // safeDivide
  // =============================
  describe('safeDivide', () => {
    it('divides normally when denominator != 0', () => {
      expect(safeDivide(10, 2)).toBe(5);
      expect(safeDivide(7, 2)).toBe(3.5);
    });

    it('returns 0 when denominator = 0', () => {
      expect(safeDivide(5, 0)).toBe(0);
      expect(safeDivide(0, 0)).toBe(0);
    });
  });

  // =============================
  // round
  // =============================
  describe('round', () => {
    it('rounds to given precision', () => {
      expect(round(1.23456, 2)).toBe(1.23);
      expect(round(1.23556, 2)).toBe(1.24);
      expect(round(12.3456, 3)).toBe(12.346);
    });

    it('handles negative and zero correctly', () => {
      expect(round(0, 2)).toBe(0);
      expect(round(-1.2345, 2)).toBe(-1.23);
    });
  });

  // =============================
  // percent
  // =============================
  describe('percent', () => {
    it('computes correct percentages', () => {
      // percent(50, 200) = 0.25 → precision+2=4 decimal places → 0.25 => 0.25
      expect(percent(50, 200)).toBeCloseTo(0.25, 4);

      // 15 / 777 ≈ 0.019307 → 0.0193 (默认4位小数)
      expect(percent(15, 777)).toBeCloseTo(0.0193, 4);
    });

    it('returns 0 when denominator = 0', () => {
      expect(percent(5, 0)).toBe(0);
    });

    it('supports custom precision', () => {
      // precision = 4 → 6 decimal places after ratio
      const p = percent(1, 3, 4);
      // ratio = 0.333333 → round(0.333333, 6) = 0.333333
      expect(p).toBeCloseTo(0.333333, 6);
    });
  });

  // =============================
  // sum
  // =============================
  describe('sum', () => {
    it('sums correctly', () => {
      expect(sum([1, 2, 3, 4])).toBe(10);
      expect(sum([5, -5, 10])).toBe(10);
    });

    it('handles empty arrays', () => {
      expect(sum([])).toBe(0);
    });
  });
});
